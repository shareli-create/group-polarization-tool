import { useFirebaseState } from './hooks/useFirebaseState';
import React, { useState, useEffect } from 'react';

// ============= TYPES =============
enum ScenarioID {
  CHESS = 'chess',
  MEDICAL = 'medical',
}

enum Phase {
  INDIVIDUAL_INPUT = 'INDIVIDUAL_INPUT',
  GROUP_FORMATION = 'GROUP_FORMATION',
  GROUP_DELIBERATION = 'GROUP_DELIBERATION',
  RESULTS_DEBRIEF = 'RESULTS_DEBRIEF',
}

interface IndividualResponse {
  id: string;
  studentId: string;
  threshold: number;
  justification: string;
  timestamp: number;
}

interface Group {
  id: string;
  name: string;
  memberIds: string[];
  consensus: {
    [key in ScenarioID]?: {
      threshold: number;
      justification: string;
    }
  };
}

interface AppState {
  phase: Phase;
  chessResponses: IndividualResponse[];
  medicalResponses: IndividualResponse[];
  groups: Group[];
}

// Changes are made from the latest saved data (see useFirebaseState), never from this page's copy.
type StateChange = (updater: (current: AppState) => AppState) => Promise<boolean>;
type AddResponses = (chess: IndividualResponse, medical: IndividualResponse) => Promise<boolean>;

// ============= CONSTANTS =============
const SCENARIOS: Record<ScenarioID, { title: string; description: string; question: string }> = {
  [ScenarioID.CHESS]: {
    title: "The Chess Scenario",
    description: "David, a talented chess player, is taking part in a national chess tournament. In an early round he is drawn to play against the top-ranked player in the tournament. David's own ranking is much lower. During the game, David thinks of a brilliant move that could lead to a quick win. However, if the move fails, David will be left in an exposed position and defeat will be almost certain.",
    question: "What is the lowest probability that the move will succeed at which you would advise David to try it? The chances should be ___ in 10."
  },
  [ScenarioID.MEDICAL]: {
    title: "The Medical Scenario",
    description: "Galit, who recently got married, has just learned from a medical check-up that she has a heart defect that would seriously endanger her life during pregnancy and childbirth. As an only child, she has always hoped to raise several children. Her doctor told her that a delicate operation could be performed which, if successful, would solve the problem completely. However, the success of the operation is not guaranteed, and in fact the operation could be fatal.",
    question: "What is the lowest probability that the operation will succeed at which you would advise Galit to have it? The chances should be ___ in 10."
  }
};

const PHASE_NAMES = {
  [Phase.INDIVIDUAL_INPUT]: 'Individual Input',
  [Phase.GROUP_FORMATION]: 'Group Formation',
  [Phase.GROUP_DELIBERATION]: 'Group Discussion',
  [Phase.RESULTS_DEBRIEF]: 'Results & Analysis'
};

// ============= UI COMPONENTS =============
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>{children}</div>
);

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  className?: string;
}> = ({ children, onClick, disabled, variant = 'primary', type = 'button', className = '' }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${variants[variant]} disabled:bg-gray-300 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

const Slider: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
}> = ({ label, value, onChange }) => (
  <div className="space-y-2" dir="ltr">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <span className="text-lg font-bold text-blue-600">{value}</span>
    </div>
    <input
      type="range"
      min="1"
      max="10"
      step="0.1"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
    <div className="flex justify-between text-xs text-gray-500">
      <span>1</span>
      <span>10</span>
    </div>
  </div>
);

// ============= STUDENT PHASES =============
const IndividualPhase: React.FC<{
  state: AppState;
  addResponses: AddResponses;
}> = ({ state, addResponses }) => {
  const [studentId, setStudentId] = useState('');
  const [chessThreshold, setChessThreshold] = useState(5);
  const [chessJustification, setChessJustification] = useState('');
  const [medicalThreshold, setMedicalThreshold] = useState(5);
  const [medicalJustification, setMedicalJustification] = useState('');

  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<string | null>(() => localStorage.getItem('currentStudentId'));
  const [justSaved, setJustSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = studentId.trim();
    if (!name) {
      alert('Please enter your name or ID');
      return;
    }
    if (!chessJustification.trim() || !medicalJustification.trim()) {
      alert('Please add a justification for both scenarios');
      return;
    }
    // Two students with the same name would be counted as one person.
    if (state.chessResponses.some(r => r.studentId.trim().toLowerCase() === name.toLowerCase())) {
      alert(`The name "${name}" has already been submitted. If you already submitted, your decisions are saved. Otherwise, add something to your name (for example the first letter of your surname).`);
      return;
    }

    const newChess: IndividualResponse = {
      id: crypto.randomUUID(),
      studentId: name,
      threshold: chessThreshold,
      justification: chessJustification,
      timestamp: Date.now()
    };

    const newMedical: IndividualResponse = {
      id: crypto.randomUUID(),
      studentId: name,
      threshold: medicalThreshold,
      justification: medicalJustification,
      timestamp: Date.now()
    };

    setSaving(true);
    const ok = await addResponses(newChess, newMedical);
    setSaving(false);
    if (!ok) return;   // the student was told; the form keeps what they wrote

    localStorage.setItem('currentStudentId', name);
    setMine(name);
    setJustSaved(true);

    setStudentId('');
    setChessThreshold(5);
    setChessJustification('');
    setMedicalThreshold(5);
    setMedicalJustification('');
  };

  const studentCount = new Set(state.chessResponses.map(r => r.studentId)).size;
  // Confirmed by the saved data itself, not only by this page.
  const mineIsSaved = !!mine && state.chessResponses.some(r => r.studentId === mine);
  useEffect(() => { if (mineIsSaved) setJustSaved(false); }, [mineIsSaved]);

  if (mine && (mineIsSaved || justSaved)) {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">Your decisions were saved, {mine}</h2>
        <p className="text-gray-600 mb-4">Please wait for the next step. The instructor will move the class on.</p>
        <p className="text-sm text-gray-500">{studentCount} students have submitted so far.</p>
        <button
          type="button"
          onClick={() => { localStorage.removeItem('currentStudentId'); setMine(null); setJustSaved(false); }}
          className="mt-6 text-sm text-blue-600 underline"
        >
          Someone else using this device? Click here
        </button>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-center mb-2">Step 1: Individual Decisions</h1>
        <p className="text-center text-gray-600">
          Please read both scenarios and submit your decisions.{' '}
          <span className="font-semibold">{studentCount} students</span> have submitted so far.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="max-w-sm mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name or ID</label>
            <input
              type="text"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter a unique ID..."
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="text-left">
                <h2 className="text-2xl font-bold mb-2">{SCENARIOS[ScenarioID.CHESS].title}</h2>
                <p className="mb-4 text-sm">{SCENARIOS[ScenarioID.CHESS].description}</p>
                <p className="font-semibold">{SCENARIOS[ScenarioID.CHESS].question}</p>
              </div>
              <div className="mt-4 space-y-4">
                <Slider label="Probability threshold" value={chessThreshold} onChange={setChessThreshold} />
                <textarea
                  value={chessJustification}
                  onChange={(e) => setChessJustification(e.target.value)}
                  placeholder="Briefly justify your answer..."
                  className="w-full p-2 border border-gray-300 rounded-md text-left"
                  rows={3}
                />
              </div>
            </Card>
            
            <Card>
              <div className="text-left">
                <h2 className="text-2xl font-bold mb-2">{SCENARIOS[ScenarioID.MEDICAL].title}</h2>
                <p className="mb-4 text-sm">{SCENARIOS[ScenarioID.MEDICAL].description}</p>
                <p className="font-semibold">{SCENARIOS[ScenarioID.MEDICAL].question}</p>
              </div>
              <div className="mt-4 space-y-4">
                <Slider label="Probability threshold" value={medicalThreshold} onChange={setMedicalThreshold} />
                <textarea
                  value={medicalJustification}
                  onChange={(e) => setMedicalJustification(e.target.value)}
                  placeholder="Briefly justify your answer..."
                  className="w-full p-2 border border-gray-300 rounded-md text-left"
                  rows={3}
                />
              </div>
            </Card>
          </div>
          
          <div className="text-center">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Submit my decisions'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const GroupDeliberationPhase: React.FC<{
  state: AppState;
  onStateChange: StateChange;
}> = ({ state, onStateChange }) => {
  const currentStudentId = localStorage.getItem('currentStudentId');
  const currentUserGroup = state.groups.find(g => g.memberIds.includes(currentStudentId || ''));

  const [chessConsensus, setChessConsensus] = useState(5);
  const [chessJustification, setChessJustification] = useState('');
  const [medicalConsensus, setMedicalConsensus] = useState(5);
  const [medicalJustification, setMedicalJustification] = useState('');

  useEffect(() => {
    if (currentUserGroup) {
      if (currentUserGroup.consensus[ScenarioID.CHESS]) {
        setChessConsensus(currentUserGroup.consensus[ScenarioID.CHESS].threshold);
        setChessJustification(currentUserGroup.consensus[ScenarioID.CHESS].justification);
      }
      if (currentUserGroup.consensus[ScenarioID.MEDICAL]) {
        setMedicalConsensus(currentUserGroup.consensus[ScenarioID.MEDICAL].threshold);
        setMedicalJustification(currentUserGroup.consensus[ScenarioID.MEDICAL].justification);
      }
    }
  }, [currentUserGroup]);

  if (!currentUserGroup) {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Waiting for group assignment</h2>
        <p className="text-gray-600">The instructor has not assigned you to a group yet</p>
      </Card>
    );
  }

  const handleSubmit = async () => {
    if (!chessJustification.trim() || !medicalJustification.trim()) {
      alert('Please add a justification for both scenarios');
      return;
    }

    const consensus = {
      [ScenarioID.CHESS]: { threshold: chessConsensus, justification: chessJustification },
      [ScenarioID.MEDICAL]: { threshold: medicalConsensus, justification: medicalJustification }
    };
    const groupId = currentUserGroup.id;
    const ok = await onStateChange(current => ({
      ...current,
      groups: current.groups.map(g => g.id === groupId ? { ...g, consensus } : g)
    }));
    if (ok) alert('Group consensus saved successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-center mb-2">Step 3: Group Discussion</h1>
        <p className="text-center text-gray-600">Discuss as a group and reach a joint decision</p>
      </div>

      <Card>
        <h3 className="text-xl font-bold mb-4">{currentUserGroup.name}</h3>
        <p className="text-sm text-gray-600 mb-6">Group members: {currentUserGroup.memberIds.join(', ')}</p>

        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-bold text-lg mb-2">{SCENARIOS[ScenarioID.CHESS].title}</h4>
            <Slider 
              label="Group decision" 
              value={chessConsensus} 
              onChange={setChessConsensus} 
            />
            <textarea
              value={chessJustification}
              onChange={(e) => setChessJustification(e.target.value)}
              placeholder="Brief justification for the group's decision..."
              className="w-full p-2 mt-3 border border-gray-300 rounded-md text-left"
              rows={2}
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-bold text-lg mb-2">{SCENARIOS[ScenarioID.MEDICAL].title}</h4>
            <Slider 
              label="Group decision" 
              value={medicalConsensus} 
              onChange={setMedicalConsensus} 
            />
            <textarea
              value={medicalJustification}
              onChange={(e) => setMedicalJustification(e.target.value)}
              placeholder="Brief justification for the group's decision..."
              className="w-full p-2 mt-3 border border-gray-300 rounded-md text-left"
              rows={2}
            />
          </div>

          <div className="text-center">
            <Button onClick={handleSubmit}>Submit group consensus</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============= CORRECT RISK SCALE BAR GRAPH =============
const GroupResultsAnalysis: React.FC<{
  state: AppState;
}> = ({ state }) => {
  return (
    <div className="space-y-8">
      {Object.entries(SCENARIOS).map(([scenarioId, scenario]) => {
        const responses = scenarioId === 'chess' ? state.chessResponses : state.medicalResponses;
        
        return (
          <Card key={scenarioId}>
            <h3 className="text-2xl font-bold mb-6 text-center">{scenario.title}</h3>
            
            <div className="space-y-8">
              {state.groups.map(group => {
                const groupResponses = responses.filter(r => group.memberIds.includes(r.studentId));
                const individualMean = groupResponses.length > 0 
                  ? groupResponses.reduce((sum, r) => sum + r.threshold, 0) / groupResponses.length 
                  : 0;
                const groupConsensus = group.consensus[scenarioId as ScenarioID]?.threshold || 0;

                if (!group.consensus[scenarioId as ScenarioID]) return null;

                return (
                  <div key={group.id} className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
                    <h4 className="font-bold text-xl mb-6 text-center">{group.name}</h4>
                    
                    <div className="mb-6">
                      {/* Correct scale labels */}
                      <div className="flex justify-between text-sm font-medium mb-3 text-gray-700">
                        <span>0 (very risky)</span>
                        <span>5 (average)</span>
                        <span>10 (very safe)</span>
                      </div>
                      
                      {/* Individual Mean Bar */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-blue-600 mb-2">Individual mean: {individualMean.toFixed(1)}</div>
                        <div className="h-8 bg-gray-200 rounded border">
                          <div 
                            className="h-full bg-blue-500 rounded"
                            style={{ width: `${(individualMean / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Group Decision Bar */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-red-600 mb-2">Group decision: {groupConsensus.toFixed(1)}</div>
                        <div className="h-8 bg-gray-200 rounded border">
                          <div 
                            className="h-full bg-red-500 rounded"
                            style={{ width: `${(groupConsensus / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Explanation */}
                      <div className="text-xs text-gray-500 mt-2 text-center">
                        Lower numbers = willingness to take a risk with a low chance of success
                      </div>
                    </div>

                    {/* Individual ratings */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-3">Individual ratings:</p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {groupResponses.map(r => (
                          <span key={r.id} className="px-3 py-1 bg-gray-100 border rounded text-sm">
                            {r.studentId}: {r.threshold}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
// ============= FIXED CLASS SUMMARY TABLE =============
const ClassSummaryTable: React.FC<{
  state: AppState;
}> = ({ state }) => {
  const calculateStats = (scenarioId: ScenarioID) => {
    const responses = scenarioId === ScenarioID.CHESS ? state.chessResponses : state.medicalResponses;
    const groupsWithData = state.groups.filter(g => g.consensus[scenarioId]);
    
    let safer = 0;
    let riskier = 0;
    let close = 0;
    
    groupsWithData.forEach(group => {
      const groupResponses = responses.filter(r => group.memberIds.includes(r.studentId));
      if (groupResponses.length === 0) return;
      
      const individualMean = groupResponses.reduce((sum, r) => sum + r.threshold, 0) / groupResponses.length;
      const groupConsensus = group.consensus[scenarioId]?.threshold || 0;
      const difference = groupConsensus - individualMean;
      
      // The scale is the minimum chance of success required, so a HIGHER
      // group threshold than the members' mean is a SAFER (more cautious) decision.
      if (Math.abs(difference) <= 0.3) {
        close++;
      } else if (difference > 0.3) {
        safer++;
      } else {
        riskier++;
      }
    });
    
    return { safer, riskier, close, total: groupsWithData.length };
  };

  const chessStats = calculateStats(ScenarioID.CHESS);
  const medicalStats = calculateStats(ScenarioID.MEDICAL);
  
  const completedGroups = state.groups.filter(g => 
    g.consensus[ScenarioID.CHESS] && g.consensus[ScenarioID.MEDICAL]
  );

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-3xl font-bold mb-8 text-center">Class Results Summary</h2>
        
        <div className="mb-6 text-center">
          <p className="text-lg font-medium text-gray-700">
            Total groups that completed both scenarios: <span className="text-2xl font-bold text-blue-600">{completedGroups.length}</span>
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-6 py-4 text-left font-bold">Scenario</th>
                <th className="border border-gray-300 px-6 py-4 text-center font-bold">
                  Safer than the mean<br/>
                  <span className="text-sm font-normal">(difference &gt; +0.3)</span>
                </th>
                <th className="border border-gray-300 px-6 py-4 text-center font-bold">
                  Close to the mean<br/>
                  <span className="text-sm font-normal">(difference within ±0.3)</span>
                </th>
                <th className="border border-gray-300 px-6 py-4 text-center font-bold">
                  Riskier than the mean<br/>
                  <span className="text-sm font-normal">(difference &lt; -0.3)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-6 py-4 font-medium bg-blue-50">
                  {SCENARIOS[ScenarioID.CHESS].title}
                </td>
                <td className="border border-gray-300 px-6 py-4 text-center text-2xl font-bold text-green-600">
                  {chessStats.safer}
                </td>
                <td className="border border-gray-300 px-6 py-4 text-center text-2xl font-bold text-gray-600">
                  {chessStats.close}
                </td>
                <td className="border border-gray-300 px-6 py-4 text-center text-2xl font-bold text-red-600">
                  {chessStats.riskier}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-6 py-4 font-medium bg-purple-50">
                  {SCENARIOS[ScenarioID.MEDICAL].title}
                </td>
                <td className="border border-gray-300 px-6 py-4 text-center text-2xl font-bold text-green-600">
                  {medicalStats.safer}
                </td>
                <td className="border border-gray-300 px-6 py-4 text-center text-2xl font-bold text-gray-600">
                  {medicalStats.close}
                </td>
                <td className="border border-gray-300 px-6 py-4 text-center text-2xl font-bold text-red-600">
                  {medicalStats.riskier}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>The table shows how many groups reached a decision that was safer than, close to, or riskier than the mean of their members' individual responses</p>
        </div>
      </Card>
    </div>
  );
};

// ============= STUDENT VIEW =============
const StudentView: React.FC<{
  state: AppState;
  onStateChange: StateChange;
  addResponses: AddResponses;
}> = ({ state, onStateChange, addResponses }) => {
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gray-50" dir="ltr">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Group Polarization Teaching Tool</h1>
        <p className="text-gray-600">Student view</p>
        <div className="mt-4 inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
          Current stage: {PHASE_NAMES[state.phase]}
        </div>
      </header>
      
      <main>
        {state.phase === Phase.INDIVIDUAL_INPUT ? (
          <IndividualPhase state={state} addResponses={addResponses} />
        ) : state.phase === Phase.GROUP_DELIBERATION ? (
          <GroupDeliberationPhase state={state} onStateChange={onStateChange} />
        ) : (
          <Card className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Waiting for the next stage</h2>
            <p className="text-gray-600">
              {state.phase === Phase.GROUP_FORMATION && 'The instructor is assigning groups...'}
              {state.phase === Phase.RESULTS_DEBRIEF && 'The instructor is presenting the results...'}
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};


// ============= PROFESSOR VIEW - IMPROVED =============
const ProfessorDashboard: React.FC<{
  state: AppState;
  onStateChange: StateChange;
}> = ({ state, onStateChange }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'responses' | 'groups' | 'analysis' | 'summary'>('overview');
  
  const allStudents = React.useMemo(() => {
    const ids = new Set<string>();
    state.chessResponses.forEach(r => ids.add(r.studentId));
    state.medicalResponses.forEach(r => ids.add(r.studentId));
    return Array.from(ids);
  }, [state]);

  // Smart auto-grouping that balances sizes to avoid small remainders
  const createAutoGroups = (targetSize: number) => {
    const totalStudents = allStudents.length;
    if (totalStudents === 0) return;
    
    const shuffled = [...allStudents].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = [];
    
    // Calculate optimal distribution
    const numGroups = Math.ceil(totalStudents / targetSize);
    const baseSize = Math.floor(totalStudents / numGroups);
    const remainder = totalStudents % numGroups;
    
    // Distribute students: some groups get baseSize+1, others get baseSize
    let currentIndex = 0;
    for (let i = 0; i < numGroups; i++) {
      const groupSize = i < remainder ? baseSize + 1 : baseSize;
      newGroups.push({
        id: crypto.randomUUID(),
        name: `Group ${i + 1}`,
        memberIds: shuffled.slice(currentIndex, currentIndex + groupSize),
        consensus: {}
      });
      currentIndex += groupSize;
    }
    
    onStateChange(current => ({ ...current, groups: newGroups }));
  };

  const simulateResults = () => {
    const mockGroups: Group[] = [];
    const mockChessResponses: IndividualResponse[] = [];
    const mockMedicalResponses: IndividualResponse[] = [];

    for (let groupNum = 1; groupNum <= 5; groupNum++) {
      const memberIds = [`Student${groupNum}A`, `Student${groupNum}B`, `Student${groupNum}C`];
      
      memberIds.forEach((studentId, index) => {
        const chessBase = 3 + groupNum * 1.2 + Math.random() * 2;
        mockChessResponses.push({
          id: crypto.randomUUID(),
          studentId,
          threshold: Math.min(10, Math.max(1, chessBase)),
          justification: `Reasoning of ${studentId}`,
          timestamp: Date.now()
        });

        const medicalBase = 5.5 + groupNum * 0.8 + Math.random() * 2;
        mockMedicalResponses.push({
          id: crypto.randomUUID(),
          studentId,
          threshold: Math.min(10, Math.max(1, medicalBase)),
          justification: `Reasoning of ${studentId}`,
          timestamp: Date.now()
        });
      });

      const groupChessResponses = mockChessResponses.filter(r => memberIds.includes(r.studentId));
      const groupMedicalResponses = mockMedicalResponses.filter(r => memberIds.includes(r.studentId));
      
      const chessMean = groupChessResponses.reduce((sum, r) => sum + r.threshold, 0) / groupChessResponses.length;
      const medicalMean = groupMedicalResponses.reduce((sum, r) => sum + r.threshold, 0) / groupMedicalResponses.length;

      const chessConsensus = Math.min(10, Math.max(1, chessMean + (Math.random() > 0.3 ? 1 : -0.5)));
      const medicalConsensus = Math.min(10, Math.max(1, medicalMean + (Math.random() > 0.3 ? -1 : 0.5)));

      mockGroups.push({
        id: crypto.randomUUID(),
        name: `Group ${groupNum}`,
        memberIds,
        consensus: {
          [ScenarioID.CHESS]: {
            threshold: chessConsensus,
            justification: `Group decision ${groupNum}`
          },
          [ScenarioID.MEDICAL]: {
            threshold: medicalConsensus,
            justification: `Group decision ${groupNum}`
          }
        }
      });
    }

    onStateChange(current => ({
      ...current,
      chessResponses: [...current.chessResponses, ...mockChessResponses],
      medicalResponses: [...current.medicalResponses, ...mockMedicalResponses],
      groups: [...current.groups, ...mockGroups]
    }));
  };

  const handleRestart = () => {
    if (confirm('Are you sure? All data will be deleted.')) {
      onStateChange(() => ({
        phase: Phase.INDIVIDUAL_INPUT,
        chessResponses: [],
        medicalResponses: [],
        groups: []
      }));
    }
  };

  // Calculate stats
  const totalGroups = state.groups.length;
  const completedGroups = state.groups.filter(g => 
    g.consensus[ScenarioID.CHESS] && g.consensus[ScenarioID.MEDICAL]
  ).length;

  // Phase configuration
  const phases = [
    {
      phase: Phase.INDIVIDUAL_INPUT,
      number: 1,
      icon: '📝',
      title: 'Individual Input',
      description: 'Students submit individual decisions',
      canProceed: allStudents.length >= 2,
      status: allStudents.length >= 2 ? 'Ready to continue' : `At least 2 students needed (${allStudents.length} so far)`
    },
    {
      phase: Phase.GROUP_FORMATION,
      number: 2,
      icon: '👥',
      title: 'Group Formation',
      description: 'Divide students into groups',
      canProceed: totalGroups > 0,
      status: totalGroups === 0 ? 'Create groups to continue' : `${totalGroups} groups created`
    },
    {
      phase: Phase.GROUP_DELIBERATION,
      number: 3,
      icon: '💬',
      title: 'Group Discussion',
      description: 'Groups reach consensus',
      canProceed: true,
      status: `${completedGroups}/${totalGroups} groups completed`
    },
    {
      phase: Phase.RESULTS_DEBRIEF,
      number: 4,
      icon: '📊',
      title: 'Results & Analysis',
      description: 'View and analyze results',
      canProceed: true,
      status: 'Analysis available'
    }
  ];

  const currentPhaseIndex = phases.findIndex(p => p.phase === state.phase);
  const currentPhaseConfig = phases[currentPhaseIndex];

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Instructor Dashboard</h1>
          <p className="text-gray-600">Track student progress and manage the exercise</p>
        </div>
      </div>

      {/* Stage Progress Indicator - Sticky */}
      <div className="sticky top-0 z-50 bg-white shadow-md border-b-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-2">
            {phases.map((phaseConfig, index) => {
              const isActive = phaseConfig.phase === state.phase;
              const isCompleted = index < currentPhaseIndex;
              const isAccessible = index <= currentPhaseIndex || phaseConfig.canProceed;
              
              return (
                <React.Fragment key={phaseConfig.phase}>
                  {/* Stage Box */}
                  <button
                    onClick={() => {
                      if (isAccessible || index < currentPhaseIndex) {
                        onStateChange(current => ({ ...current, phase: phaseConfig.phase }));
                      }
                    }}
                    disabled={!isAccessible && index > currentPhaseIndex}
                    className={`
                      flex-1 p-4 rounded-lg border-2 transition-all duration-300
                      ${isActive 
                        ? 'bg-blue-50 border-blue-500 shadow-lg scale-105' 
                        : isCompleted
                        ? 'bg-green-50 border-green-500 hover:shadow-md'
                        : isAccessible
                        ? 'bg-gray-50 border-gray-300 hover:border-gray-400 hover:shadow-md'
                        : 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {/* Stage Number */}
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${isActive 
                          ? 'bg-blue-500 text-white' 
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : isAccessible
                          ? 'bg-gray-300 text-gray-700'
                          : 'bg-gray-200 text-gray-400'
                        }
                      `}>
                        {isCompleted ? '✓' : phaseConfig.number}
                      </div>
                      
                      {/* Icon */}
                      <span className="text-2xl">{phaseConfig.icon}</span>
                      
                      {/* Title */}
                      <div className="flex-1 text-left">
                        <div className={`font-bold ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                          {phaseConfig.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {phaseConfig.description}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status */}
                    {isActive && (
                      <div className="text-xs mt-2">
                        <span className={`
                          inline-block px-2 py-1 rounded-full
                          ${phaseConfig.canProceed 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                          }
                        `}>
                          {phaseConfig.status}
                        </span>
                      </div>
                    )}
                  </button>
                  
                  {/* Arrow */}
                  {index < phases.length - 1 && (
                    <div className="text-2xl text-gray-400">→</div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 flex gap-3 justify-center flex-wrap">
            {currentPhaseIndex < phases.length - 1 && (
              <div className="flex flex-col items-center gap-2 w-full">
                {currentPhaseConfig.canProceed ? (
                  <>
                    <Button
                      onClick={() => {
                        const nextPhase = phases[currentPhaseIndex + 1];
                        if (nextPhase) {
                          onStateChange(current => ({ ...current, phase: nextPhase.phase }));
                        }
                      }}
                      className="px-8 py-3 text-lg"
                    >
                      ➡️ Finish "{currentPhaseConfig.title}" → Start "{phases[currentPhaseIndex + 1]?.title}"
                    </Button>
                    <div className="text-xs text-gray-600 bg-white px-3 py-1 rounded">
                      {state.phase === Phase.INDIVIDUAL_INPUT && `Students will see that they are being assigned to groups`}
                      {state.phase === Phase.GROUP_FORMATION && `Students will start the group discussion`}
                      {state.phase === Phase.GROUP_DELIBERATION && `Students will be able to see the results`}
                    </div>
                  </>
                ) : (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg px-6 py-3 text-center">
                    <div className="font-bold text-yellow-800">⚠️ Cannot continue yet</div>
                    <div className="text-sm text-yellow-700 mt-1">{currentPhaseConfig.status}</div>
                  </div>
                )}
              </div>
            )}
            
            <Button variant="danger" onClick={handleRestart} className="px-6 py-3">
              🔄 Restart
            </Button>
            
            <Button variant="secondary" onClick={simulateResults} className="px-6 py-3">
              🧪 Simulate 5 groups
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Total participants</div>
                <div className="text-3xl font-bold text-blue-600">{allStudents.length}</div>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </Card>
          
          <Card className="border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Groups formed</div>
                <div className="text-3xl font-bold text-green-600">{totalGroups}</div>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
          </Card>
          
          <Card className="border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Groups completed</div>
                <div className="text-3xl font-bold text-purple-600">{completedGroups}/{totalGroups}</div>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {[
              { id: 'overview', label: 'Overview', icon: '📋' },
              { id: 'responses', label: 'Responses', icon: '📝' },
              { id: 'groups', label: 'Groups', icon: '👥' },
              { id: 'analysis', label: 'Analysis', icon: '📊' },
              { id: 'summary', label: 'Class Summary', icon: '📈' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 px-6 py-4 font-semibold transition-colors
                  ${activeTab === tab.id
                    ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Phase Guidance */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-3xl">{currentPhaseConfig.icon}</span>
                    Current stage: {currentPhaseConfig.title}
                  </h3>
                  <p className="text-gray-700 mb-3">{currentPhaseConfig.description}</p>
                  <div className="bg-white rounded p-3 inline-block">
                    <span className="font-semibold">Status:</span> {currentPhaseConfig.status}
                  </div>
                </div>

                {/* Phase-specific guidance */}
                {state.phase === Phase.INDIVIDUAL_INPUT && (
                  <>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                      <h4 className="font-bold text-yellow-900 mb-3">💡 Guidance for this stage:</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Share the student link with the class</li>
                        <li>• Wait for students to submit their individual responses</li>
                        <li>• At least 2 students are needed to continue</li>
                        <li>• Current students: <strong>{allStudents.length}</strong></li>
                      </ul>
                    </div>
                    
                    {/* Student View Preview */}
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>👁️</span> What students see now:
                      </h4>
                      <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                        <div className="text-sm text-gray-600 mb-2">[Student view]</div>
                        <h5 className="font-bold text-lg mb-2">Individual assessment</h5>
                        <p className="text-gray-700 text-sm">Students see both scenarios and enter their individual responses (threshold + justification)</p>
                      </div>
                    </div>
                  </>
                )}

                {state.phase === Phase.GROUP_FORMATION && (
                  <>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                      <h4 className="font-bold text-yellow-900 mb-3">💡 Guidance for this stage:</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Go to the "Groups" tab to create groups</li>
                        <li>• Use automatic grouping or assign students manually</li>
                        <li>• Recommended group size: 3–5 students</li>
                        <li>• Once the groups are created, move to stage 3</li>
                      </ul>
                    </div>
                    
                    {/* Student View Preview */}
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>👁️</span> What students see now:
                      </h4>
                      <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                        <div className="text-sm text-gray-600 mb-2">[Student view]</div>
                        <h5 className="font-bold text-lg mb-2">Waiting for group assignment</h5>
                        <p className="text-gray-700 text-sm">Students see the message: "Your answers have been saved. Waiting for the instructor to form groups..."</p>
                      </div>
                    </div>
                  </>
                )}

                {state.phase === Phase.GROUP_DELIBERATION && (
                  <>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                      <h4 className="font-bold text-yellow-900 mb-3">💡 Guidance for this stage:</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Groups are now discussing and reaching consensus</li>
                        <li>• Track progress in the "Groups" tab</li>
                        <li>• Groups completed: <strong>{completedGroups}/{totalGroups}</strong></li>
                        <li>• When enough groups have finished, move to the results</li>
                      </ul>
                    </div>
                    
                    {/* Student View Preview */}
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>👁️</span> What students see now:
                      </h4>
                      <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                        <div className="text-sm text-gray-600 mb-2">[Student view]</div>
                        <h5 className="font-bold text-lg mb-2">Group Discussion</h5>
                        <p className="text-gray-700 text-sm mb-2">Students see:</p>
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          <li>The individual responses of all group members</li>
                          <li>A form for entering the group consensus (threshold + shared justification)</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {state.phase === Phase.RESULTS_DEBRIEF && (
                  <>
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                      <h4 className="font-bold text-green-900 mb-3">💡 The exercise is complete!</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• See the detailed analysis in the "Analysis" tab</li>
                        <li>• Discuss the results with the class</li>
                        <li>• Explain the polarization patterns that emerged</li>
                        <li>• You can start a new exercise with the "Restart" button</li>
                      </ul>
                    </div>
                    
                    {/* Student View Preview */}
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>👁️</span> What students see now:
                      </h4>
                      <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                        <div className="text-sm text-gray-600 mb-2">[Student view]</div>
                        <h5 className="font-bold text-lg mb-2">Results & Analysis</h5>
                        <p className="text-gray-700 text-sm mb-2">Students see:</p>
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          <li>A comparison of their individual answer with their group's consensus</li>
                          <li>Histograms showing the distribution of responses</li>
                          <li>An analysis of polarization trends</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'responses' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold mb-4">Individual Responses</h3>
                {[ScenarioID.CHESS, ScenarioID.MEDICAL].map(scenarioId => {
                  const responses = scenarioId === ScenarioID.CHESS ? state.chessResponses : state.medicalResponses;
                  return (
                    <Card key={scenarioId}>
                      <h4 className="font-bold text-xl mb-4">{SCENARIOS[scenarioId].title}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Student</th>
                              <th className="text-center p-2">Threshold</th>
                              <th className="text-left p-2">Justification</th>
                            </tr>
                          </thead>
                          <tbody>
                            {responses.map(r => (
                              <tr key={r.id} className="border-b">
                                <td className="p-2">{r.studentId}</td>
                                <td className="text-center p-2 font-bold">{r.threshold}</td>
                                <td className="p-2 text-sm text-gray-600">{r.justification}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {activeTab === 'groups' && (
              <div className="space-y-4">
                <Card>
                  <h3 className="text-xl font-bold mb-4">Group Management</h3>
                  
                  {/* Auto-grouping with preview */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-3">Automatic Grouping</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {allStudents.length} students in total. Choose a preferred group size:
                    </p>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[3, 4, 5].map(targetSize => {
                        const totalStudents = allStudents.length;
                        if (totalStudents === 0) return null;
                        
                        const numGroups = Math.ceil(totalStudents / targetSize);
                        const baseSize = Math.floor(totalStudents / numGroups);
                        const remainder = totalStudents % numGroups;
                        
                        // Calculate how many groups of each size
                        const largerGroups = remainder;
                        const smallerGroups = numGroups - remainder;
                        
                        return (
                          <button
                            key={targetSize}
                            onClick={() => createAutoGroups(targetSize)}
                            className="bg-white border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg p-3 transition-all text-left"
                          >
                            <div className="font-bold text-blue-700 mb-1">Preferred size: {targetSize}</div>
                            <div className="text-xs text-gray-600">
                              Result: {numGroups} groups
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {largerGroups > 0 && `${largerGroups}×${baseSize + 1}`}
                              {largerGroups > 0 && smallerGroups > 0 && ', '}
                              {smallerGroups > 0 && `${smallerGroups}×${baseSize}`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                      💡 The algorithm divides students as evenly as possible to avoid groups that are too small
                    </div>
                  </div>
                </Card>

                {/* Groups display */}
                {state.groups.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {state.groups.map(group => (
                      <Card key={group.id}>
                        <h4 className="font-bold mb-2">{group.name}</h4>
                        <p className="text-sm text-gray-600">Members ({group.memberIds.length}): {group.memberIds.join(', ')}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs">
                            Chess: {group.consensus[ScenarioID.CHESS] ? `✓ ${group.consensus[ScenarioID.CHESS].threshold}` : '✗'}
                          </p>
                          <p className="text-xs">
                            Medical: {group.consensus[ScenarioID.MEDICAL] ? `✓ ${group.consensus[ScenarioID.MEDICAL].threshold}` : '✗'}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analysis' && (
              <GroupResultsAnalysis state={state} />
            )}

            {activeTab === 'summary' && (
              <ClassSummaryTable state={state} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============= MAIN APP =============
const App: React.FC = () => {
  const { state, updateState, addResponses, loading } = useFirebaseState();
  const [view, setView] = useState<'student' | 'professor'>('student');

  useEffect(() => {
    if (window.location.pathname.includes('/professor')) {
      setView('professor');
      // Slightly larger text on the professor dashboard (easier to read when projected).
      // Tailwind sizes are in rem, so this scales the whole dashboard; the student view is unchanged.
      document.documentElement.style.fontSize = '18px';
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="ltr">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'student' ? (
        <StudentView state={state} onStateChange={updateState} addResponses={addResponses} />
      ) : (
        <ProfessorDashboard state={state} onStateChange={updateState} />
      )}
    </div>
  );
};

export default App;