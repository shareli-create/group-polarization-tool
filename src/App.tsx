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
    title: "תרחיש השחמט",
    description: "דוד, שחקן שחמט מוכשר, משתתף בתחרות שחמט ארצית. במשחק בשלב המוקדם הוא מוגרל למשחק כנגד השחקן שמדורג ראשון בתחרות. דירוגו של דוד נמוך בהרבה. במהלך המשחק דוד חושב על תכסיס מבריק שעשוי להוביל אותו לניצחון מהיר. אולם, אם התרגיל יכשל, דוד יישאר בעמדה חשופה ואז ההפסד כמעט בטוח.",
    question: "מהי ההסתברות הנמוכה ביותר שהתכסיס יצליח שאם היא תתקיים תייעץ לדוד לנסות את התכסיס? צריך להיות סיכוי של ___ ל-10."
  },
  [ScenarioID.MEDICAL]: {
    title: "התרחיש הרפואי",
    description: "גלית, שנישאה לא מזמן, גילתה לאחרונה במסגרת בדיקה רפואית שיש לה פגם בלב שמסכן את חייה מאד בזמן הריון ולידה. בתור ילדה יחידה היא תמיד קיוותה לגדל מספר ילדים. הרופא אמר לה שניתן לבצע ניתוח עדין אשר באם יצליח הבעיה תיפטר לחלוטין. אולם, ההצלחה של הניתוח איננה מובטחת ולמעשה הניתוח עשוי לגרום למוות.",
    question: "מהי ההסתברות הנמוכה ביותר שהניתוח יצליח שאם היא תתקיים תייעץ לגלית לעבור את הניתוח? צריך להיות סיכוי של ___ ל-10."
  }
};

const PHASE_NAMES = {
  [Phase.INDIVIDUAL_INPUT]: 'קלט אישי',
  [Phase.GROUP_FORMATION]: 'הקמת קבוצות',
  [Phase.GROUP_DELIBERATION]: 'דיון קבוצתי',
  [Phase.RESULTS_DEBRIEF]: 'תוצאות וניתוח'
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
  <div className="space-y-2" dir="rtl">
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
      alert('אנא הזן את שמך או מזהה');
      return;
    }
    if (!chessJustification.trim() || !medicalJustification.trim()) {
      alert('אנא הוסף הצדקה לשני התרחישים');
      return;
    }
    // Two students with the same name would be counted as one person.
    if (state.chessResponses.some(r => r.studentId.trim().toLowerCase() === name.toLowerCase())) {
      alert(`השם "${name}" כבר נשלח. אם כבר שלחת, ההחלטות שלך שמורות. אחרת, הוסף/י משהו לשם (למשל האות הראשונה של שם המשפחה).`);
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
        <h2 className="text-2xl font-bold mb-2">ההחלטות שלך נשמרו, {mine}</h2>
        <p className="text-gray-600 mb-4">אפשר להמתין לשלב הבא. המרצה יעביר את הכיתה הלאה.</p>
        <p className="text-sm text-gray-500">{studentCount} סטודנטים שלחו עד כה.</p>
        <button
          type="button"
          onClick={() => { localStorage.removeItem('currentStudentId'); setMine(null); setJustSaved(false); }}
          className="mt-6 text-sm text-blue-600 underline"
        >
          סטודנט/ית אחר/ת משתמש/ת במכשיר הזה? לחצו כאן
        </button>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-center mb-2">שלב 1: החלטות אישיות</h1>
        <p className="text-center text-gray-600">
          אנא קרא את שני התרחישים ושלח את החלטותיך.{' '}
          <span className="font-semibold">{studentCount} סטודנטים</span> שלחו עד כה.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="max-w-sm mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">שם או מזהה</label>
            <input
              type="text"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="הזן מזהה ייחודי..."
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="text-right">
                <h2 className="text-2xl font-bold mb-2">{SCENARIOS[ScenarioID.CHESS].title}</h2>
                <p className="mb-4 text-sm">{SCENARIOS[ScenarioID.CHESS].description}</p>
                <p className="font-semibold">{SCENARIOS[ScenarioID.CHESS].question}</p>
              </div>
              <div className="mt-4 space-y-4">
                <Slider label="סף הסתברות" value={chessThreshold} onChange={setChessThreshold} />
                <textarea
                  value={chessJustification}
                  onChange={(e) => setChessJustification(e.target.value)}
                  placeholder="הצדק בקצרה את תשובתך..."
                  className="w-full p-2 border border-gray-300 rounded-md text-right"
                  rows={3}
                />
              </div>
            </Card>
            
            <Card>
              <div className="text-right">
                <h2 className="text-2xl font-bold mb-2">{SCENARIOS[ScenarioID.MEDICAL].title}</h2>
                <p className="mb-4 text-sm">{SCENARIOS[ScenarioID.MEDICAL].description}</p>
                <p className="font-semibold">{SCENARIOS[ScenarioID.MEDICAL].question}</p>
              </div>
              <div className="mt-4 space-y-4">
                <Slider label="סף הסתברות" value={medicalThreshold} onChange={setMedicalThreshold} />
                <textarea
                  value={medicalJustification}
                  onChange={(e) => setMedicalJustification(e.target.value)}
                  placeholder="הצדק בקצרה את תשובתך..."
                  className="w-full p-2 border border-gray-300 rounded-md text-right"
                  rows={3}
                />
              </div>
            </Card>
          </div>
          
          <div className="text-center">
            <Button type="submit" disabled={saving}>{saving ? 'שומר...' : 'שלח את ההחלטות שלי'}</Button>
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
        <h2 className="text-2xl font-bold mb-4">ממתין להקצאת קבוצה</h2>
        <p className="text-gray-600">המרצה עדיין לא שיבץ אותך לקבוצה</p>
      </Card>
    );
  }

  const handleSubmit = async () => {
    if (!chessJustification.trim() || !medicalJustification.trim()) {
      alert('אנא הוסף הצדקה לשני התרחישים');
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
    if (ok) alert('הקונצנזוס הקבוצתי נשמר בהצלחה!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-center mb-2">שלב 3: דיון קבוצתי</h1>
        <p className="text-center text-gray-600">דונו בקבוצה והגיעו להחלטה משותפת</p>
      </div>

      <Card>
        <h3 className="text-xl font-bold mb-4">{currentUserGroup.name}</h3>
        <p className="text-sm text-gray-600 mb-6">חברי הקבוצה: {currentUserGroup.memberIds.join(', ')}</p>

        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-bold text-lg mb-2">{SCENARIOS[ScenarioID.CHESS].title}</h4>
            <Slider 
              label="החלטת הקבוצה" 
              value={chessConsensus} 
              onChange={setChessConsensus} 
            />
            <textarea
              value={chessJustification}
              onChange={(e) => setChessJustification(e.target.value)}
              placeholder="הצדקה קצרה להחלטת הקבוצה..."
              className="w-full p-2 mt-3 border border-gray-300 rounded-md text-right"
              rows={2}
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-bold text-lg mb-2">{SCENARIOS[ScenarioID.MEDICAL].title}</h4>
            <Slider 
              label="החלטת הקבוצה" 
              value={medicalConsensus} 
              onChange={setMedicalConsensus} 
            />
            <textarea
              value={medicalJustification}
              onChange={(e) => setMedicalJustification(e.target.value)}
              placeholder="הצדקה קצרה להחלטת הקבוצה..."
              className="w-full p-2 mt-3 border border-gray-300 rounded-md text-right"
              rows={2}
            />
          </div>

          <div className="text-center">
            <Button onClick={handleSubmit}>שלח קונצנזוס קבוצתי</Button>
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
                        <span>0 (מאוד מסוכן)</span>
                        <span>5 (ממוצע)</span>
                        <span>10 (מאוד בטוח)</span>
                      </div>
                      
                      {/* Individual Mean Bar */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-blue-600 mb-2">ממוצע אישי: {individualMean.toFixed(1)}</div>
                        <div className="h-8 bg-gray-200 rounded border">
                          <div 
                            className="h-full bg-blue-500 rounded"
                            style={{ width: `${(individualMean / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Group Decision Bar */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-red-600 mb-2">החלטת קבוצה: {groupConsensus.toFixed(1)}</div>
                        <div className="h-8 bg-gray-200 rounded border">
                          <div 
                            className="h-full bg-red-500 rounded"
                            style={{ width: `${(groupConsensus / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Explanation */}
                      <div className="text-xs text-gray-500 mt-2 text-center">
                        מספרים נמוכים = נכונות לקחת סיכון עם סיכוי הצלחה נמוך
                      </div>
                    </div>

                    {/* Individual ratings */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-3">דירוגים אישיים:</p>
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
      
      if (Math.abs(difference) <= 0.3) {
        close++;
      } else if (difference > 0.3) {
        // סף גבוה מהממוצע = דרישה לסיכוי הצלחה גבוה יותר = החלטה בטוחה יותר
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
        <h2 className="text-3xl font-bold mb-8 text-center">סיכום תוצאות הכיתה</h2>
        
        <div className="mb-6 text-center">
          <p className="text-lg font-medium text-gray-700">
            סה"כ קבוצות שהשלימו את שני התרחישים: <span className="text-2xl font-bold text-blue-600">{completedGroups.length}</span>
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-6 py-4 text-right font-bold">תרחיש</th>
                <th className="border border-gray-300 px-6 py-4 text-center font-bold">
                  בטוח יותר מהממוצע<br/>
                  <span className="text-sm font-normal">(הפרש &gt; +0.3)</span>
                </th>
                <th className="border border-gray-300 px-6 py-4 text-center font-bold">
                  קרוב לממוצע<br/>
                  <span className="text-sm font-normal">(הפרש ±0.3)</span>
                </th>
                <th className="border border-gray-300 px-6 py-4 text-center font-bold">
                  מסוכן יותר מהממוצע<br/>
                  <span className="text-sm font-normal">(הפרש &lt; -0.3)</span>
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
          <p>הטבלה מראה כמה קבוצות הגיעו להחלטה בטוחה יותר, קרובה או מסוכנת יותר מהממוצע הקבוצתי האישי</p>
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
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gray-50" dir="rtl">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">כלי לימודי לקיטוב קבוצתי</h1>
        <p className="text-gray-600">תצוגת סטודנט</p>
        <div className="mt-4 inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
          שלב נוכחי: {PHASE_NAMES[state.phase]}
        </div>
      </header>
      
      <main>
        {state.phase === Phase.INDIVIDUAL_INPUT ? (
          <IndividualPhase state={state} addResponses={addResponses} />
        ) : state.phase === Phase.GROUP_DELIBERATION ? (
          <GroupDeliberationPhase state={state} onStateChange={onStateChange} />
        ) : (
          <Card className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">ממתין לשלב הבא</h2>
            <p className="text-gray-600">
              {state.phase === Phase.GROUP_FORMATION && 'המרצה מקצה קבוצות...'}
              {state.phase === Phase.RESULTS_DEBRIEF && 'המרצה מציג תוצאות...'}
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
        name: `קבוצה ${i + 1}`,
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
          justification: `חשיבה של ${studentId}`,
          timestamp: Date.now()
        });

        const medicalBase = 5.5 + groupNum * 0.8 + Math.random() * 2;
        mockMedicalResponses.push({
          id: crypto.randomUUID(),
          studentId,
          threshold: Math.min(10, Math.max(1, medicalBase)),
          justification: `חשיבה של ${studentId}`,
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
        name: `קבוצה ${groupNum}`,
        memberIds,
        consensus: {
          [ScenarioID.CHESS]: {
            threshold: chessConsensus,
            justification: `החלטה קבוצתית ${groupNum}`
          },
          [ScenarioID.MEDICAL]: {
            threshold: medicalConsensus,
            justification: `החלטה קבוצתית ${groupNum}`
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
    if (confirm('האם אתה בטוח? כל הנתונים יימחקו.')) {
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
      title: 'קלט אישי',
      description: 'סטודנטים שולחים החלטות אישיות',
      canProceed: allStudents.length >= 2,
      status: allStudents.length >= 2 ? 'מוכן להמשיך' : `צריך לפחות 2 סטודנטים (${allStudents.length} עד כה)`
    },
    {
      phase: Phase.GROUP_FORMATION,
      number: 2,
      icon: '👥',
      title: 'הקמת קבוצות',
      description: 'חלק סטודנטים לקבוצות',
      canProceed: totalGroups > 0,
      status: totalGroups === 0 ? 'צור קבוצות כדי להמשיך' : `${totalGroups} קבוצות נוצרו`
    },
    {
      phase: Phase.GROUP_DELIBERATION,
      number: 3,
      icon: '💬',
      title: 'דיון קבוצתי',
      description: 'קבוצות מגיעות לקונצנזוס',
      canProceed: true,
      status: `${completedGroups}/${totalGroups} קבוצות השלימו`
    },
    {
      phase: Phase.RESULTS_DEBRIEF,
      number: 4,
      icon: '📊',
      title: 'תוצאות וניתוח',
      description: 'צפייה וניתוח תוצאות',
      canProceed: true,
      status: 'ניתוח זמין'
    }
  ];

  const currentPhaseIndex = phases.findIndex(p => p.phase === state.phase);
  const currentPhaseConfig = phases[currentPhaseIndex];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900">לוח בקרה למרצה</h1>
          <p className="text-gray-600">עקוב אחר התקדמות הסטודנטים ונהל את התרגיל</p>
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
                      <div className="flex-1 text-right">
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
                    <div className="text-2xl text-gray-400">←</div>
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
                      ➡️ סיים "{currentPhaseConfig.title}" ← התחל "{phases[currentPhaseIndex + 1]?.title}"
                    </Button>
                    <div className="text-xs text-gray-600 bg-white px-3 py-1 rounded">
                      {state.phase === Phase.INDIVIDUAL_INPUT && `הסטודנטים יוכלו לראות שהם משובצים לקבוצות`}
                      {state.phase === Phase.GROUP_FORMATION && `הסטודנטים יתחילו דיון קבוצתי`}
                      {state.phase === Phase.GROUP_DELIBERATION && `הסטודנטים יוכלו לראות את התוצאות`}
                    </div>
                  </>
                ) : (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg px-6 py-3 text-center">
                    <div className="font-bold text-yellow-800">⚠️ לא ניתן להמשיך עדיין</div>
                    <div className="text-sm text-yellow-700 mt-1">{currentPhaseConfig.status}</div>
                  </div>
                )}
              </div>
            )}
            
            <Button variant="danger" onClick={handleRestart} className="px-6 py-3">
              🔄 התחל מחדש
            </Button>
            
            <Button variant="secondary" onClick={simulateResults} className="px-6 py-3">
              🧪 הדמיית 5 קבוצות
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">סה״כ משתתפים</div>
                <div className="text-3xl font-bold text-blue-600">{allStudents.length}</div>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </Card>
          
          <Card className="border-r-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">קבוצות שהוקמו</div>
                <div className="text-3xl font-bold text-green-600">{totalGroups}</div>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
          </Card>
          
          <Card className="border-r-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">קבוצות שהשלימו</div>
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
              { id: 'overview', label: 'סקירה', icon: '📋' },
              { id: 'responses', label: 'תשובות', icon: '📝' },
              { id: 'groups', label: 'קבוצות', icon: '👥' },
              { id: 'analysis', label: 'ניתוח', icon: '📊' },
              { id: 'summary', label: 'סיכום כיתתי', icon: '📈' },
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
                <span className="ml-2">{tab.icon}</span>
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
                    שלב נוכחי: {currentPhaseConfig.title}
                  </h3>
                  <p className="text-gray-700 mb-3">{currentPhaseConfig.description}</p>
                  <div className="bg-white rounded p-3 inline-block">
                    <span className="font-semibold">סטטוס:</span> {currentPhaseConfig.status}
                  </div>
                </div>

                {/* Phase-specific guidance */}
                {state.phase === Phase.INDIVIDUAL_INPUT && (
                  <>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                      <h4 className="font-bold text-yellow-900 mb-3">💡 הנחיות לשלב זה:</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• שתף את קישור הסטודנטים עם הכיתה</li>
                        <li>• המתן שהסטודנטים ישלחו את התשובות האישיות שלהם</li>
                        <li>• מינימום 2 סטודנטים נדרשים להמשיך</li>
                        <li>• סטודנטים נוכחיים: <strong>{allStudents.length}</strong></li>
                      </ul>
                    </div>
                    
                    {/* Student View Preview */}
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>👁️</span> מה הסטודנטים רואים עכשיו:
                      </h4>
                      <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                        <div className="text-sm text-gray-600 mb-2">[תצוגת סטודנט]</div>
                        <h5 className="font-bold text-lg mb-2">הערכה אישית</h5>
                        <p className="text-gray-700 text-sm">הסטודנטים רואים את שני התרחישים ומזינים את התשובות האישיות שלהם (סף + הצדקה)</p>
                      </div>
                    </div>
                  </>
                )}

                {state.phase === Phase.GROUP_FORMATION && (
                  <>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                      <h4 className="font-bold text-yellow-900 mb-3">💡 הנחיות לשלב זה:</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• עבור לטאב "קבוצות" כדי לצור קבוצות</li>
                        <li>• השתמש ביצירה אוטומטית או הקצה סטודנטים ידנית</li>
                        <li>• גודל קבוצה מומלץ: 3-5 סטודנטים</li>
                        <li>• לאחר יצירת הקבוצות, עבור לשלב 3</li>
                      </ul>
                    </div>
                    
                    {/* Student View Preview */}
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>👁️</span> מה הסטודנטים רואים עכשיו:
                      </h4>
                      <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                        <div className="text-sm text-gray-600 mb-2">[תצוגת סטודנט]</div>
                        <h5 className="font-bold text-lg mb-2">ממתין לשיבוץ קבוצתי</h5>
                        <p className="text-gray-700 text-sm">הסטודנטים רואים הודעה: "תשובותיך נשמרו. ממתין שהמרצה יחלק לקבוצות..."</p>
                      </div>
                    </div>
                  </>
                )}

                {state.phase === Phase.GROUP_DELIBERATION && (
                  <>
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                      <h4 className="font-bold text-yellow-900 mb-3">💡 הנחיות לשלב זה:</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• הקבוצות כעת דנות ומגיעות לקונצנזוס</li>
                        <li>• עקוב אחר התקדמות בטאב "קבוצות"</li>
                        <li>• קבוצות שהשלימו: <strong>{completedGroups}/{totalGroups}</strong></li>
                        <li>• כשמספיק קבוצות סיימו, עבור לתוצאות</li>
                      </ul>
                    </div>
                    
                    {/* Student View Preview */}
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>👁️</span> מה הסטודנטים רואים עכשיו:
                      </h4>
                      <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                        <div className="text-sm text-gray-600 mb-2">[תצוגת סטודנט]</div>
                        <h5 className="font-bold text-lg mb-2">דיון קבוצתי</h5>
                        <p className="text-gray-700 text-sm mb-2">הסטודנטים רואים:</p>
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          <li>את התשובות האישיות של כל חברי הקבוצה</li>
                          <li>טופס להזנת קונצנזוס קבוצתי (סף + הצדקה משותפת)</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {state.phase === Phase.RESULTS_DEBRIEF && (
                  <>
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                      <h4 className="font-bold text-green-900 mb-3">💡 התרגיל הסתיים!</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>• צפה בניתוח מפורט בטאב "ניתוח"</li>
                        <li>• דון בתוצאות עם הכיתה</li>
                        <li>• הסבר את דפוסי הפולריזציה שזוהו</li>
                        <li>• ניתן להתחיל תרגיל חדש עם כפתור "התחל מחדש"</li>
                      </ul>
                    </div>
                    
                    {/* Student View Preview */}
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
                      <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span>👁️</span> מה הסטודנטים רואים עכשיו:
                      </h4>
                      <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                        <div className="text-sm text-gray-600 mb-2">[תצוגת סטודנט]</div>
                        <h5 className="font-bold text-lg mb-2">תוצאות וניתוח</h5>
                        <p className="text-gray-700 text-sm mb-2">הסטודנטים רואים:</p>
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          <li>השוואה בין התשובה האישית לקונצנזוס הקבוצתי שלהם</li>
                          <li>היסטוגרמות המראות את התפלגות התשובות</li>
                          <li>ניתוח של מגמות הפולריזציה</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'responses' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold mb-4">תשובות אישיות</h3>
                {[ScenarioID.CHESS, ScenarioID.MEDICAL].map(scenarioId => {
                  const responses = scenarioId === ScenarioID.CHESS ? state.chessResponses : state.medicalResponses;
                  return (
                    <Card key={scenarioId}>
                      <h4 className="font-bold text-xl mb-4">{SCENARIOS[scenarioId].title}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-right p-2">סטודנט</th>
                              <th className="text-center p-2">סף</th>
                              <th className="text-right p-2">הצדקה</th>
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
                  <h3 className="text-xl font-bold mb-4">ניהול קבוצות</h3>
                  
                  {/* Auto-grouping with preview */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-3">חלוקה אוטומטית לקבוצות</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      סה"כ {allStudents.length} סטודנטים. בחר גודל קבוצה מועדף:
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
                            className="bg-white border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg p-3 transition-all text-right"
                          >
                            <div className="font-bold text-blue-700 mb-1">גודל מועדף: {targetSize}</div>
                            <div className="text-xs text-gray-600">
                              תוצאה: {numGroups} קבוצות
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
                      💡 האלגוריתם מחלק באופן שווה ככל האפשר כדי למנוע קבוצות קטנות מדי
                    </div>
                  </div>
                </Card>

                {/* Groups display */}
                {state.groups.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {state.groups.map(group => (
                      <Card key={group.id}>
                        <h4 className="font-bold mb-2">{group.name}</h4>
                        <p className="text-sm text-gray-600">חברים ({group.memberIds.length}): {group.memberIds.join(', ')}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs">
                            שחמט: {group.consensus[ScenarioID.CHESS] ? `✓ ${group.consensus[ScenarioID.CHESS].threshold}` : '✗'}
                          </p>
                          <p className="text-xs">
                            רפואי: {group.consensus[ScenarioID.MEDICAL] ? `✓ ${group.consensus[ScenarioID.MEDICAL].threshold}` : '✗'}
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
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-xl text-gray-600">טוען...</div>
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