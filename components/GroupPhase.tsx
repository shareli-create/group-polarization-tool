import React, { useState, useMemo } from 'react';
import { IndividualResponse, Group, ScenarioID } from '../types';
import { SCENARIOS } from '../constants';
import { calculateMean } from '../services/analysisService';
import Card from './ui/Card';
import Button from './ui/Button';
import Slider from './ui/Slider';

interface GroupPhaseProps {
  responses: Record<ScenarioID, IndividualResponse[]>;
  onComplete: (groups: Group[]) => void;
}

// --- Group Deliberation Components ---

const GroupDeliberationCard: React.FC<{
    group: Group;
    onUpdate: (groupId: string, scenarioId: ScenarioID, threshold: number, justification: string) => void;
    initialResponses: Record<ScenarioID, IndividualResponse[]>;
}> = ({ group, onUpdate, initialResponses }) => {
    
    const getScenarioConsensus = (scenarioId: ScenarioID) => group.consensus[scenarioId] ?? { threshold: 5, justification: '' };
    
    const [chessConsensus, setChessConsensus] = useState(getScenarioConsensus(ScenarioID.CHESS));
    const [medicalConsensus, setMedicalConsensus] = useState(getScenarioConsensus(ScenarioID.MEDICAL));

    const preDiscussionMeanChess = useMemo(() => calculateMean(initialResponses[ScenarioID.CHESS].map(r => r.threshold)), [initialResponses]);
    const preDiscussionMeanMedical = useMemo(() => calculateMean(initialResponses[ScenarioID.MEDICAL].map(r => r.threshold)), [initialResponses]);

    const handleUpdate = (scenarioId: ScenarioID) => {
        const consensus = scenarioId === ScenarioID.CHESS ? chessConsensus : medicalConsensus;
        if(consensus.justification.trim()) {
            onUpdate(group.id, scenarioId, consensus.threshold, consensus.justification);
        } else {
            alert('Please provide a justification.');
        }
    };
    
    const isChessSubmitted = group.consensus[ScenarioID.CHESS] !== undefined;
    const isMedicalSubmitted = group.consensus[ScenarioID.MEDICAL] !== undefined;

    return (
        <Card className={(isChessSubmitted && isMedicalSubmitted) ? 'border-2 border-green-500' : ''}>
            <h3 className="text-xl font-bold mb-2">{group.name}</h3>
            <p className="text-sm text-gray-600 mb-4">Members: {group.memberIds.join(', ')}</p>

            {/* Chess Scenario */}
            <div className={`p-3 rounded-md mb-4 ${isChessSubmitted ? 'bg-green-50' : 'bg-gray-50'}`}>
                <h4 className="font-semibold">{SCENARIOS.chess.title}</h4>
                <p className="text-xs text-gray-500 mb-2">Pre-discussion Average: {preDiscussionMeanChess.toFixed(2)}</p>
                <Slider label="Group Consensus" value={chessConsensus.threshold} onChange={val => setChessConsensus(c => ({ ...c, threshold: val }))} />
                <textarea
                    value={chessConsensus.justification}
                    onChange={(e) => setChessConsensus(c => ({ ...c, justification: e.target.value }))}
                    placeholder="Brief group justification for Chess..."
                    className="w-full p-2 mt-2 border border-gray-300 rounded-md" rows={2} />
                <Button onClick={() => handleUpdate(ScenarioID.CHESS)} size="sm" className="mt-2">{isChessSubmitted ? 'Update' : 'Submit'}</Button>
            </div>

            {/* Medical Scenario */}
            <div className={`p-3 rounded-md ${isMedicalSubmitted ? 'bg-green-50' : 'bg-gray-50'}`}>
                <h4 className="font-semibold">{SCENARIOS.medical.title}</h4>
                <p className="text-xs text-gray-500 mb-2">Pre-discussion Average: {preDiscussionMeanMedical.toFixed(2)}</p>
                <Slider label="Group Consensus" value={medicalConsensus.threshold} onChange={val => setMedicalConsensus(c => ({ ...c, threshold: val }))} />
                <textarea
                    value={medicalConsensus.justification}
                    onChange={(e) => setMedicalConsensus(c => ({ ...c, justification: e.target.value }))}
                    placeholder="Brief group justification for Medical..."
                    className="w-full p-2 mt-2 border border-gray-300 rounded-md" rows={2} />
                <Button onClick={() => handleUpdate(ScenarioID.MEDICAL)} size="sm" className="mt-2">{isMedicalSubmitted ? 'Update' : 'Submit'}</Button>
            </div>
        </Card>
    );
};


const GroupDeliberationPhase: React.FC<{
    groups: Group[];
    responses: Record<ScenarioID, IndividualResponse[]>;
    onComplete: (groups: Group[]) => void;
}> = ({ groups: initialGroups, responses, onComplete }) => {
    const [groups, setGroups] = useState<Group[]>(initialGroups);

    const updateGroupConsensus = (groupId: string, scenarioId: ScenarioID, threshold: number, justification: string) => {
        setGroups(currentGroups => currentGroups.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    consensus: {
                        ...g.consensus,
                        [scenarioId]: { threshold, justification },
                    }
                };
            }
            return g;
        }));
    };
    
    const allGroupsSubmitted = groups.every(g => g.consensus[ScenarioID.CHESS] && g.consensus[ScenarioID.MEDICAL]);

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6">Phase 3: Group Deliberation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(group => {
                    const groupResponses = (scenarioId: ScenarioID) => responses[scenarioId].filter(r => group.memberIds.includes(r.studentId));
                    return (
                        <GroupDeliberationCard 
                            key={group.id} 
                            group={group} 
                            onUpdate={updateGroupConsensus} 
                            initialResponses={{
                                [ScenarioID.CHESS]: groupResponses(ScenarioID.CHESS),
                                [ScenarioID.MEDICAL]: groupResponses(ScenarioID.MEDICAL),
                            }}
                        />
                    );
                })}
            </div>
            <div className="text-center mt-8">
                <Button onClick={() => onComplete(groups)} disabled={!allGroupsSubmitted}>
                    Finalize Group Submissions & View Results
                </Button>
                {!allGroupsSubmitted && <p className="text-sm text-red-600 mt-2">All groups must submit their consensus for both scenarios to proceed.</p>}
            </div>
        </div>
    );
};


// --- Group Formation Components ---
const GroupFormationPhase: React.FC<{
    studentIds: string[];
    onGroupsCreated: (groups: Group[]) => void;
}> = ({ studentIds, onGroupsCreated }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [draggedStudent, setDraggedStudent] = useState<string | null>(null);

    const ungroupedStudents = useMemo(() => {
        const groupedStudentIds = new Set(groups.flatMap(g => g.memberIds));
        return studentIds.filter(id => !groupedStudentIds.has(id));
    }, [studentIds, groups]);

    const addGroup = () => {
        const groupName = prompt("Enter group name:", `Group ${groups.length + 1}`);
        if (groupName) {
            setGroups([...groups, { id: crypto.randomUUID(), name: groupName, memberIds: [], consensus: {} }]);
        }
    };

    const handleDrop = (groupId: string) => {
        if (!draggedStudent) return;
        setGroups(currentGroups => {
            const newGroups = currentGroups.map(g => ({
                ...g,
                memberIds: g.memberIds.filter(id => id !== draggedStudent)
            }));
            const targetGroup = newGroups.find(g => g.id === groupId);
            if(targetGroup && !targetGroup.memberIds.includes(draggedStudent)) {
                targetGroup.memberIds.push(draggedStudent);
            }
            return newGroups;
        });
        setDraggedStudent(null);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6">Phase 2: Group Formation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <h3 className="font-semibold text-lg mb-2">Ungrouped Students ({ungroupedStudents.length})</h3>
                    <div className="bg-gray-100 p-2 rounded-md min-h-48 space-y-2">
                        {ungroupedStudents.map(studentId => (
                            <div key={studentId} draggable onDragStart={() => setDraggedStudent(studentId)} className="p-2 bg-white rounded shadow cursor-grab active:cursor-grabbing">
                                {studentId}
                            </div>
                        ))}
                    </div>
                </Card>
                <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-lg">Groups ({groups.length})</h3>
                        <Button onClick={addGroup}>+ Add Group</Button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {groups.map(group => (
                            <Card key={group.id} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(group.id)} className="min-h-48 bg-blue-50">
                                <h4 className="font-bold">{group.name}</h4>
                                <div className="mt-2 space-y-2">
                                    {group.memberIds.map(studentId => (
                                         <div key={studentId} draggable onDragStart={() => setDraggedStudent(studentId)} className="p-2 bg-white rounded shadow cursor-grab active:cursor-grabbing">
                                            {studentId}
                                        </div>
                                    ))}
                                    {group.memberIds.length === 0 && <p className="text-sm text-gray-500 text-center pt-4">Drag students here</p>}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
            <div className="text-center mt-8">
                <Button onClick={() => onGroupsCreated(groups)} disabled={ungroupedStudents.length > 0 || groups.length === 0}>
                    Confirm Groups & Start Deliberation
                </Button>
                {ungroupedStudents.length > 0 && <p className="text-sm text-red-600 mt-2">All students must be assigned to a group to proceed.</p>}
            </div>
        </div>
    );
};


const GroupPhase: React.FC<GroupPhaseProps> = ({ responses, onComplete }) => {
  const [formedGroups, setFormedGroups] = useState<Group[] | null>(null);
  
  const studentIds = useMemo(() => {
    const ids = new Set(responses[ScenarioID.CHESS].map(r => r.studentId));
    return Array.from(ids);
  }, [responses]);

  if (!formedGroups) {
    return <GroupFormationPhase studentIds={studentIds} onGroupsCreated={setFormedGroups} />;
  }
  
  return <GroupDeliberationPhase groups={formedGroups} responses={responses} onComplete={onComplete} />;

};

export default GroupPhase;