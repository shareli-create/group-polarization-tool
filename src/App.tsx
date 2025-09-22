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
  onStateChange: (state: AppState) => void;
}> = ({ state, onStateChange }) => {
  const [studentId, setStudentId] = useState('');
  const [chessThreshold, setChessThreshold] = useState(5);
  const [chessJustification, setChessJustification] = useState('');
  const [medicalThreshold, setMedicalThreshold] = useState(5);
  const [medicalJustification, setMedicalJustification] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      alert('אנא הזן את שמך או מזהה');
      return;
    }
    if (!chessJustification.trim() || !medicalJustification.trim()) {
      alert('אנא הוסף הצדקה לשני התרחישים');
      return;
    }

    const newChess: IndividualResponse = {
      id: crypto.randomUUID(),
      studentId: studentId.trim(),
      threshold: chessThreshold,
      justification: chessJustification,
      timestamp: Date.now()
    };
    
    const newMedical: IndividualResponse = {
      id: crypto.randomUUID(),
      studentId: studentId.trim(),
      threshold: medicalThreshold,
      justification: medicalJustification,
      timestamp: Date.now()
    };

    onStateChange({
      ...state,
      chessResponses: [...state.chessResponses, newChess],
      medicalResponses: [...state.medicalResponses, newMedical]
    });
    
    // Store current student ID
    localStorage.setItem('currentStudentId', studentId.trim());
    
    setStudentId('');
    setChessThreshold(5);
    setChessJustification('');
    setMedicalThreshold(5);
    setMedicalJustification('');
  };

  const studentCount = new Set(state.chessResponses.map(r => r.studentId)).size;

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
            <Button type="submit">שלח את ההחלטות שלי</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const GroupDeliberationPhase: React.FC<{
  state: AppState;
  onStateChange: (state: AppState) => void;
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

  const handleSubmit = () => {
    if (!chessJustification.trim() || !medicalJustification.trim()) {
      alert('אנא הוסף הצדקה לשני התרחישים');
      return;
    }

    const updatedGroups = state.groups.map(g => {
      if (g.id === currentUserGroup.id) {
        return {
          ...g,
          consensus: {
            [ScenarioID.CHESS]: { threshold: chessConsensus, justification: chessJustification },
            [ScenarioID.MEDICAL]: { threshold: medicalConsensus, justification: medicalJustification }
          }
        };
      }
      return g;
    });
    
    onStateChange({ ...state, groups: updatedGroups });
    alert('הקונצנזוס הקבוצתי נשמר בהצלחה!');
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

// ============= CLASS SUMMARY COMPONENT =============
const ClassSummary: React.FC<{
  state: AppState;
}> = ({ state }) => {
  const calculateClassStats = (scenarioId: ScenarioID) => {
    const responses = scenarioId === ScenarioID.CHESS ? state.chessResponses : state.medicalResponses;
    
    const groupsWithData = state.groups.filter(g => g.consensus[scenarioId]);
    const totalGroups = groupsWithData.length;
    
    let polarizedTowardsRisk = 0;
    let polarizedTowardsCaution = 0;
    let noPolarization = 0;
    
    groupsWithData.forEach(group => {
      const groupResponses = responses.filter(r => group.memberIds.includes(r.studentId));
      if (groupResponses.length === 0) return;
      
      const individualMean = groupResponses.reduce((sum, r) => sum + r.threshold, 0) / groupResponses.length;
      const groupConsensus = group.consensus[scenarioId]?.threshold || 0;
      const shift = groupConsensus - individualMean;
      
      if (shift > 0.5) polarizedTowardsRisk++;
      else if (shift < -0.5) polarizedTowardsCaution++;
      else noPolarization++;
    });
    
    return { totalGroups, polarizedTowardsRisk, polarizedTowardsCaution, noPolarization };
  };

  const chessStats = calculateClassStats(ScenarioID.CHESS);
  const medicalStats = calculateClassStats(ScenarioID.MEDICAL);

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-3xl font-bold mb-6 text-center">סיכום כיתתי - תופעת הקיטוב הקבוצתי</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-center text-blue-600">
              {SCENARIOS[ScenarioID.CHESS].title}
            </h3>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-2">מתוך {chessStats.totalGroups} קבוצות:</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">קיטוב לכיוון סיכון ↑</span>
                    <span className="text-2xl font-bold text-red-600">
                      {chessStats.polarizedTowardsRisk}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg">קיטוב לכיוון זהירות ↓</span>
                    <span className="text-2xl font-bold text-green-600">
                      {chessStats.polarizedTowardsCaution}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg">ללא קיטוב</span>
                    <span className="text-2xl font-bold text-gray-600">
                      {chessStats.noPolarization}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="space-y-2">
                  {chessStats.polarizedTowardsRisk > 0 && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-8 bg-red-500 rounded transition-all duration-500"
                        style={{ width: `${(chessStats.polarizedTowardsRisk / chessStats.totalGroups) * 100}%` }}
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {((chessStats.polarizedTowardsRisk / chessStats.totalGroups) * 100).toFixed(0)}% לסיכון
                      </span>
                    </div>
                  )}
                  {chessStats.polarizedTowardsCaution > 0 && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-8 bg-green-500 rounded transition-all duration-500"
                        style={{ width: `${(chessStats.polarizedTowardsCaution / chessStats.totalGroups) * 100}%` }}
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {((chessStats.polarizedTowardsCaution / chessStats.totalGroups) * 100).toFixed(0)}% לזהירות
                      </span>
                    </div>
                  )}
                  {chessStats.noPolarization > 0 && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-8 bg-gray-400 rounded transition-all duration-500"
                        style={{ width: `${(chessStats.noPolarization / chessStats.totalGroups) * 100}%` }}
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {((chessStats.noPolarization / chessStats.totalGroups) * 100).toFixed(0)}% יציב
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-200 text-center">
                <p className="text-sm text-gray-700">
                  <strong>קיטוב צפוי:</strong> קבוצות נוטות להחליט על <strong className="text-red-600">סיכון גבוה יותר</strong> מהממוצע האישי
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-center text-purple-600">
              {SCENARIOS[ScenarioID.MEDICAL].title}
            </h3>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-2">מתוך {medicalStats.totalGroups} קבוצות:</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">קיטוב לכיוון סיכון ↑</span>
                    <span className="text-2xl font-bold text-red-600">
                      {medicalStats.polarizedTowardsRisk}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg">קיטוב לכיוון זהירות ↓</span>
                    <span className="text-2xl font-bold text-green-600">
                      {medicalStats.polarizedTowardsCaution}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg">ללא קיטוב</span>
                    <span className="text-2xl font-bold text-gray-600">
                      {medicalStats.noPolarization}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="space-y-2">
                  {medicalStats.polarizedTowardsRisk > 0 && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-8 bg-red-500 rounded transition-all duration-500"
                        style={{ width: `${(medicalStats.polarizedTowardsRisk / medicalStats.totalGroups) * 100}%` }}
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {((medicalStats.polarizedTowardsRisk / medicalStats.totalGroups) * 100).toFixed(0)}% לסיכון
                      </span>
                    </div>
                  )}
                  {medicalStats.polarizedTowardsCaution > 0 && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-8 bg-green-500 rounded transition-all duration-500"
                        style={{ width: `${(medicalStats.polarizedTowardsCaution / medicalStats.totalGroups) * 100}%` }}
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {((medicalStats.polarizedTowardsCaution / medicalStats.totalGroups) * 100).toFixed(0)}% לזהירות
                      </span>
                    </div>
                  )}
                  {medicalStats.noPolarization > 0 && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-8 bg-gray-400 rounded transition-all duration-500"
                        style={{ width: `${(medicalStats.noPolarization / medicalStats.totalGroups) * 100}%` }}
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {((medicalStats.noPolarization / medicalStats.totalGroups) * 100).toFixed(0)}% יציב
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-purple-200 text-center">
                <p className="text-sm text-gray-700">
                  <strong>קיטוב צפוי:</strong> קבוצות נוטות להחליט על <strong className="text-green-600">זהירות גבוהה יותר</strong> מהממוצע האישי
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
          <h3 className="text-xl font-bold text-center mb-4">מסקנות כלליות</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">סך קבוצות שהראו קיטוב</p>
              <p className="text-3xl font-bold text-indigo-600">
                {chessStats.polarizedTowardsRisk + chessStats.polarizedTowardsCaution + 
                 medicalStats.polarizedTowardsRisk + medicalStats.polarizedTowardsCaution}
              </p>
              <p className="text-xs text-gray-500">
                מתוך {chessStats.totalGroups + medicalStats.totalGroups} החלטות קבוצתיות
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">אחוז קיטוב כללי</p>
              <p className="text-3xl font-bold text-indigo-600">
                {Math.round(((chessStats.polarizedTowardsRisk + chessStats.polarizedTowardsCaution + 
                             medicalStats.polarizedTowardsRisk + medicalStats.polarizedTowardsCaution) / 
                            (chessStats.totalGroups + medicalStats.totalGroups)) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">קיטוב בכיוון הצפוי</p>
              <p className="text-3xl font-bold text-green-600">
                {chessStats.polarizedTowardsRisk + medicalStats.polarizedTowardsCaution}
              </p>
              <p className="text-xs text-gray-500">
                שחמט→סיכון, רפואי→זהירות
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-indigo-200">
            <p className="text-center text-sm text-gray-700">
              <strong>הסבר:</strong> קיטוב קבוצתי מתרחש כאשר החלטת הקבוצה נמצאת בקצה יותר מהממוצע האישי של חבריה.
              בתרחיש השחמט, קבוצות נוטות לקיטוב לכיוון סיכון. בתרחיש הרפואי, קבוצות נוטות לקיטוב לכיוון זהירות.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============= STUDENT VIEW =============
const StudentView: React.FC<{
  state: AppState;
  onStateChange: (state: AppState) => void;
}> = ({ state, onStateChange }) => {
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
          <IndividualPhase state={state} onStateChange={onStateChange} />
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

// ============= PROFESSOR VIEW =============
const ProfessorDashboard: React.FC<{
  state: AppState;
  onStateChange: (state: AppState) => void;
}> = ({ state, onStateChange }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'responses' | 'groups' | 'analysis' | 'summary'>('overview');
  
  const allStudents = React.useMemo(() => {
    const ids = new Set<string>();
    state.chessResponses.forEach(r => ids.add(r.studentId));
    state.medicalResponses.forEach(r => ids.add(r.studentId));
    return Array.from(ids);
  }, [state]);

  const createAutoGroups = (size: number) => {
    const shuffled = [...allStudents].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = [];
    
    for (let i = 0; i < shuffled.length; i += size) {
      newGroups.push({
        id: crypto.randomUUID(),
        name: `קבוצה ${newGroups.length + 1}`,
        memberIds: shuffled.slice(i, i + size),
        consensus: {}
      });
    }
    
    onStateChange({ ...state, groups: newGroups });
  };

  const handleRestart = () => {
    if (confirm('האם אתה בטוח? כל הנתונים יימחקו.')) {
      onStateChange({
        phase: Phase.INDIVIDUAL_INPUT,
        chessResponses: [],
        medicalResponses: [],
        groups: []
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">לוח בקרה למרצה</h1>

      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">בקרת התרגיל</h2>
        <div className="flex items-center gap-4 mb-4">
          <span className="font-medium">שלב נוכחי:</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
            {PHASE_NAMES[state.phase]}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => onStateChange({ ...state, phase: Phase.INDIVIDUAL_INPUT })}>
            שלב 1
          </Button>
          <Button onClick={() => onStateChange({ ...state, phase: Phase.GROUP_FORMATION })}>
            שלב 2
          </Button>
          <Button onClick={() => onStateChange({ ...state, phase: Phase.GROUP_DELIBERATION })}>
            שלב 3
          </Button>
          <Button onClick={() => onStateChange({ ...state, phase: Phase.RESULTS_DEBRIEF })}>
            שלב 4
          </Button>
          <Button variant="danger" onClick={handleRestart}>
            התחל מחדש
          </Button>
        </div>
      </Card>

      <div className="border-b mb-6">
        <nav className="flex space-x-reverse space-x-8">
          {(['overview', 'responses', 'groups', 'analysis', 'summary'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 border-b-2 font-medium ${
                activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              {tab === 'overview' ? 'סקירה' : 
               tab === 'responses' ? 'תשובות' : 
               tab === 'groups' ? 'קבוצות' : 
               tab === 'analysis' ? 'ניתוח' : 
               'סיכום כיתתי'}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <h3 className="text-lg font-semibold mb-2">סטודנטים</h3>
            <p className="text-3xl font-bold text-blue-600">{allStudents.length}</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold mb-2">קבוצות</h3>
            <p className="text-3xl font-bold text-green-600">{state.groups.length}</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold mb-2">השלמה</h3>
            <p className="text-3xl font-bold text-purple-600">
              {state.groups.filter(g => g.consensus[ScenarioID.CHESS] && g.consensus[ScenarioID.MEDICAL]).length}
            </p>
          </Card>
        </div>
      )}

      {activeTab === 'responses' && (
        <div className="space-y-6">
          {Object.entries(SCENARIOS).map(([scenarioId, scenario]) => (
            <Card key={scenarioId}>
              <h3 className="text-xl font-bold mb-4">{scenario.title}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">מזהה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סף</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">הצדקה</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(scenarioId === 'chess' ? state.chessResponses : state.medicalResponses).map(response => (
                      <tr key={response.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {response.studentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {response.threshold}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {response.justification}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-6">
          <Card>
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold">ניהול קבוצות</h3>
              <div className="flex gap-2">
                <Button onClick={() => createAutoGroups(3)}>יצירה אוטומטית (3)</Button>
                <Button onClick={() => createAutoGroups(4)}>יצירה אוטומטית (4)</Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            {state.groups.map(group => (
              <Card key={group.id}>
                <h4 className="font-bold mb-2">{group.name}</h4>
                <p className="text-sm text-gray-600">חברים: {group.memberIds.join(', ')}</p>
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
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {Object.entries(SCENARIOS).map(([scenarioId, scenario]) => {
            const responses = scenarioId === 'chess' ? state.chessResponses : state.medicalResponses;
            
            return (
              <Card key={scenarioId}>
                <h3 className="text-2xl font-bold mb-6">{scenario.title} - ניתוח קיטוב</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {state.groups.map(group => {
                    const groupResponses = responses.filter(r => group.memberIds.includes(r.studentId));
                    const individualMean = groupResponses.length > 0 
                      ? groupResponses.reduce((sum, r) => sum + r.threshold, 0) / groupResponses.length 
                      : 0;
                    const groupConsensus = group.consensus[scenarioId as ScenarioID]?.threshold || 0;
                    const shift = groupConsensus - individualMean;
                    const isPolarized = Math.abs(shift) > 0.5;

                    if (!group.consensus[scenarioId as ScenarioID]) return null;

                    return (
                      <Card key={group.id} className={isPolarized ? 'border-2 border-orange-500' : 'border-2 border-gray-200'}>
                        <h4 className="font-bold mb-3">{group.name}</h4>
                        
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span>ממוצע אישי: {individualMean.toFixed(1)}</span>
                            <span>קונצנזוס: {groupConsensus.toFixed(1)}</span>
                          </div>
                          
                          <div className="relative h-12 bg-gray-200 rounded">
                            <div 
                              className="absolute h-full bg-blue-400 rounded opacity-70"
                              style={{ width: `${(individualMean / 10) * 100}%` }}
                            />
                            <div 
                              className="absolute bottom-0 h-6 bg-red-500 rounded"
                              style={{ width: `${(groupConsensus / 10) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>🔵 ממוצע אישי</span>
                            <span>🔴 החלטת קבוצה</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-sm">
                          <p>שינוי: <span className={shift > 0 ? 'text-red-600 font-bold' : shift < 0 ? 'text-green-600 font-bold' : 'text-gray-600'}>
                            {shift > 0 ? '+' : ''}{shift.toFixed(1)}
                          </span></p>
                          
                          <p className={isPolarized ? 'font-bold' : ''}>
                            {isPolarized ? (
                              shift > 0.5 ? (
                                <span className="text-red-600">🔥 קיטוב לכיוון סיכון</span>
                              ) : (
                                <span className="text-green-600">🛡️ קיטוב לכיוון זהירות</span>
                              )
                            ) : (
                              <span className="text-gray-600">😐 ללא קיטוב משמעותי</span>
                            )}
                          </p>
                          
                          {isPolarized && (
                            <p className="text-xs">
                              {((scenarioId === 'chess' && shift > 0) || (scenarioId === 'medical' && shift < 0)) ? (
                                <span className="text-blue-600">✓ כיוון צפוי</span>
                              ) : (
                                <span className="text-orange-600">⚠ כיוון לא צפוי</span>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-600">דירוגים אישיים:</p>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {groupResponses.map(r => (
                              <span key={r.id} className="px-2 py-1 bg-gray-200 rounded text-xs">
                                {r.studentId}: {r.threshold}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-bold mb-2">סיכום - {scenario.title}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">קבוצות עם קיטוב:</p>
                      <p className="text-xl font-bold text-orange-600">
                        {state.groups.filter(g => {
                          const groupResponses = responses.filter(r => g.memberIds.includes(r.studentId));
                          const mean = groupResponses.length > 0 ? groupResponses.reduce((sum, r) => sum + r.threshold, 0) / groupResponses.length : 0;
                          const consensus = g.consensus[scenarioId as ScenarioID]?.threshold || 0;
                          return Math.abs(consensus - mean) > 0.5;
                        }).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">כיוון קיטוב צפוי:</p>
                      <p className="text-sm">
                        {scenarioId === 'chess' ? '🔴 לכיוון סיכון (>ממוצע)' : '🟢 לכיוון זהירות (<ממוצע)'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === 'summary' && (
        <ClassSummary state={state} />
      )}
    </div>
  );
};

// ============= MAIN APP =============
const App: React.FC = () => {
  const { state, updateState, loading } = useFirebaseState();
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
        <StudentView state={state} onStateChange={updateState} />
      ) : (
        <ProfessorDashboard state={state} onStateChange={updateState} />
      )}
    </div>
  );
};

export default App;