import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ref, onValue, set, serverTimestamp, update, get } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { useAuth } from './AuthContext';
import { useDebounce } from '../hooks/useDebounce';

interface LKPDAnswer {
  classId: string;
  className?: string;
  studentName?: string;
  groupName?: string;
  groupMembers?: string[];
  targetId: string;
  targetType: 'user' | 'group';
  step1: any;
  step2: any;
  step3: any;
  step4: any;
  updatedAt?: any;
}

interface LKPDContextType {
  answers: LKPDAnswer | null;
  loading: boolean;
  updateStepData: (step: string, data: any) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isGroupMode: boolean;
  targetId: string | null;
  submitStep4: () => Promise<void>;
}

const LKPDContext = createContext<LKPDContextType | undefined>(undefined);

export const LKPDProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [answers, setAnswers] = useState<LKPDAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [localData, setLocalData] = useState<LKPDAnswer | null>(null);

  const isGroupMode = !!profile?.groupId;
  const targetId = isGroupMode ? profile?.groupId : profile?.uid;
  const individualId = profile?.uid;
  const classId = profile?.classCode;

  const [individualAnswers, setIndividualAnswers] = useState<LKPDAnswer | null>(null);

  // Group Subscription (Step 1-3)
  useEffect(() => {
    if (!targetId || !classId) {
      setLoading(false);
      return;
    }

    const answerId = `${classId}_${targetId}`;
    const answerRef = ref(rtdb, `answers/${answerId}`);

    const fetchMetadataAndInitialize = async () => {
      let groupName = "";
      let className = "";
      let groupMembers: string[] = [];

      if (isGroupMode) {
        const groupSnap = await get(ref(rtdb, `groups/${targetId}`));
        if (groupSnap.exists()) {
          const groupData = groupSnap.val();
          groupName = groupData.groupName;
          
          if (groupData.members && Array.isArray(groupData.members)) {
            const memberNames = await Promise.all(
              groupData.members.map(async (uid: string) => {
                const userSnap = await get(ref(rtdb, `users/${uid}`));
                return userSnap.exists() ? userSnap.val().name : "Unknown";
              })
            );
            groupMembers = memberNames;
          }
        }
      }

      if (classId) {
        const classSnap = await get(ref(rtdb, `classes/${classId}`));
        if (classSnap.exists()) {
          className = classSnap.val().className;
        }
      }

      const initial: LKPDAnswer = {
        classId,
        className,
        studentName: profile?.name || "",
        groupName: isGroupMode ? groupName : "",
        groupMembers: groupMembers,
        targetId: targetId!,
        targetType: isGroupMode ? 'group' : 'user',
        step1: {},
        step2: {
          table1: [],
          table2: [],
          table3: []
        },
        step3: {},
        step4: {}
      };
      setAnswers(initial);
      if (!isGroupMode) setLocalData(initial);
    };

    const unsubscribe = onValue(answerRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let updatedData = data as LKPDAnswer;
        let needsUpdate = false;
        
        // Resolve missing metadata for existing records
        if (!updatedData.studentName && !isGroupMode && profile?.name) {
          updatedData.studentName = profile.name;
          needsUpdate = true;
        }

        if (!updatedData.className && classId) {
          const classSnap = await get(ref(rtdb, `classes/${classId}`));
          if (classSnap.exists()) {
            updatedData.className = classSnap.val().className;
            needsUpdate = true;
          }
        }

        if (isGroupMode && !updatedData.groupName) {
          const groupSnap = await get(ref(rtdb, `groups/${targetId}`));
          if (groupSnap.exists()) {
            updatedData.groupName = groupSnap.val().groupName;
            needsUpdate = true;
          }
        }

        // If it's a group and groupMembers is missing, fetch them once
        if (isGroupMode && !updatedData.groupMembers) {
          const groupSnap = await get(ref(rtdb, `groups/${targetId}`));
          if (groupSnap.exists()) {
            const groupData = groupSnap.val();
            if (groupData.members && Array.isArray(groupData.members)) {
              const memberNames = await Promise.all(
                groupData.members.map(async (uid: string) => {
                  const userSnap = await get(ref(rtdb, `users/${uid}`));
                  return userSnap.exists() ? userSnap.val().name : "Unknown";
                })
              );
              updatedData = { ...updatedData, groupMembers: memberNames };
              needsUpdate = true;
            }
          }
        }

        setAnswers(updatedData);
        if (!isGroupMode && (!localData || needsUpdate)) {
          setLocalData(updatedData);
        }
      } else {
        fetchMetadataAndInitialize();
      }
    }, (error) => {
      console.error("RTDB Error in LKPDContext:", error);
    });

    return () => unsubscribe();
  }, [targetId, classId, isGroupMode]);

  // Individual Subscription (Step 4) - only needed if in Group Mode
  useEffect(() => {
    if (!isGroupMode || !individualId || !classId) return;

    const answerId = `${classId}_${individualId}`;
    const answerRef = ref(rtdb, `answers/${answerId}`);

    const unsubscribe = onValue(answerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIndividualAnswers(data as LKPDAnswer);
      } else {
        setIndividualAnswers({
          classId,
          className: answers?.className || "",
          studentName: profile?.name || "",
          targetId: individualId!,
          targetType: 'user',
          step1: {}, step2: {}, step3: {}, step4: {}
        });
      }
    });

    return () => unsubscribe();
  }, [isGroupMode, individualId, classId, answers?.className]);

  // Handle loading state
  useEffect(() => {
    if (answers && (!isGroupMode || individualAnswers)) {
      setLoading(false);
    }
  }, [answers, individualAnswers, isGroupMode]);

  // Debounced Save for Group
  const debouncedGroupData = useDebounce(isGroupMode ? localData : null, 1000);
  // Debounced Save for Individual
  const debouncedIndividualData = useDebounce(!isGroupMode ? localData : individualAnswers, 1000);

  useEffect(() => {
    if (isGroupMode && debouncedGroupData && targetId && classId) {
      const answerId = `${classId}_${targetId}`;
      const answerRef = ref(rtdb, `answers/${answerId}`);
      
      // Ensure group record ONLY contains Stage 1-3
      const { step4, ...groupDataOnly } = debouncedGroupData;
      update(answerRef, { ...groupDataOnly, updatedAt: serverTimestamp() });
    }
  }, [debouncedGroupData, targetId, classId, isGroupMode]);

  useEffect(() => {
    const idToUse = isGroupMode ? individualId : targetId;
    const dataToSave = isGroupMode ? individualAnswers : localData;

    if (idToUse && classId && dataToSave) {
      const answerId = `${classId}_${idToUse}`;
      const answerRef = ref(rtdb, `answers/${answerId}`);
      
      // For group members, we only save step4 to their individual record
      if (isGroupMode) {
        update(answerRef, { 
          step4: dataToSave.step4 || {}, 
          updatedAt: serverTimestamp(),
          studentName: profile?.name,
          className: answers?.className,
          classId,
          targetId: idToUse,
          targetType: 'user' // Ensure individual record is typed correctly
        });
      } else {
        update(answerRef, { ...dataToSave, updatedAt: serverTimestamp() });
      }
    }
  }, [debouncedIndividualData, classId, isGroupMode]);

  const updateStepData = useCallback((step: string, data: any) => {
    if (step === 'step4' && isGroupMode) {
      setIndividualAnswers(prev => {
        if (!prev) return null;
        return {
          ...prev,
          step4: { ...prev.step4, ...data }
        };
      });
    } else {
      setLocalData((prev) => {
        if (!prev) return isGroupMode ? answers : null;
        return {
          ...prev,
          [step]: {
            ...prev[step as keyof LKPDAnswer],
            ...data
          }
        };
      });
    }
  }, [isGroupMode, answers]);

  const submitStep4 = async () => {
    const idToUse = isGroupMode ? individualId : targetId;
    const dataToSave = isGroupMode ? individualAnswers : localData;

    if (idToUse && classId && dataToSave) {
      const answerId = `${classId}_${idToUse}`;
      const answerRef = ref(rtdb, `answers/${answerId}`);
      
      const payload: any = {
        step4: dataToSave.step4 || {},
        updatedAt: serverTimestamp(),
        studentName: profile?.name,
        className: answers?.className,
        classId,
        targetId: idToUse,
        targetType: 'user',
        submitted: true
      };

      // If solo individual, also save T1-T3
      if (!isGroupMode) {
        payload.step1 = dataToSave.step1 || {};
        payload.step2 = dataToSave.step2 || {};
        payload.step3 = dataToSave.step3 || {};
      }

      await update(answerRef, payload);
    }
  };

  const combinedAnswers = isGroupMode && answers && individualAnswers ? {
    ...answers,
    step4: individualAnswers.step4
  } : (localData || answers);

  return (
    <LKPDContext.Provider value={{ 
      answers: combinedAnswers, 
      loading, 
      updateStepData, 
      currentStep, 
      setCurrentStep, 
      isGroupMode,
      targetId: targetId || null,
      submitStep4
    }}>
      {children}
    </LKPDContext.Provider>
  );
};

export const useLKPD = () => {
  const context = useContext(LKPDContext);
  if (context === undefined) {
    throw new Error('useLKPD must be used within a LKPDProvider');
  }
  return context;
};
