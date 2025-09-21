import React, { useState, useCallback, useMemo, useEffect } from 'react';

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
    question: "דמיינ/י שאת/ה מייעץ לדוד מה לעשות. מהי ההסתברות הנמוכה ביותר שהתכסיס יצליח שאם היא תתקיים תייעץ לדוד לנסות את התכסיס? צריך להיות סיכוי של ___ ל-10 שהתכסיס יצליח טרם אייעץ לדוד לנסות אותו."
  },
  [ScenarioID.MEDICAL]: {
    title: "התרחיש הרפואי",
    description: "גלית, שנישאה לא מזמן, גילתה לאחרונה במסגרת בדיקה רפואית שיש לה פגם בלב שמסכן את חייה מאד בזמן הריון ולידה. בתור ילדה יחידה היא תמיד קיוותה לגדל מספר ילדים. הרופא אמר לה שניתן לבצע ניתוח עדין אשר באם יצליח הבעיה תיפטר לחלוטין. אולם, ההצלחה של הניתוח איננה מובטחת ולמעשה הניתוח עשוי לגרום למוות.",
    question: "דמיינ/י שאת/ה מייעץ לגלית מה לעשות. מהי ההסתברות הנמוכה ביותר שהניתוח יצליח שאם היא תתקיים תייעץ לגלית לעבור את הניתוח? צריך להיות סיכוי של ___ ל-10 שהניתוח יצליח טרם אייעץ לגלית לעבור אותו."
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
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  className?: string;
}> = ({ children, onClick, disabled, variant = 'primary', type = 'button', className = '' }) => {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300'
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${variantClasses[variant]} ${className} disabled:cursor-not-allowed`}
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

// ============= STUDENT VIEW =============
const IndividualPhase: React.FC<{
  responses: Record<ScenarioID, IndividualResponse[]>;
  onAddResponse: (chess: IndividualResponse, medical: IndividualResponse) => void;
}> = ({ responses, onAddResponse }) => {
  const [studentId, setStudentId] = useState('');
  const [chessThreshold, setChessThreshold] = useState(5);
  const [chessJustification, setChessJustification] = useState('');
  const [medicalThreshold, setMedicalThreshold] = useState(5);
  const [medicalJustification, setMedicalJustification] = useState('');

  const allStudentIds = new Set(responses[ScenarioID.CHESS].map(r => r.studentId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      alert('אנא הזן את שמך או מזהה');
      return;
    }
    if (allStudentIds.has(studentId.trim())) {
      alert('מזהה זה כבר שלח תשובה');
      return;
    }
    if (!chessJustification.trim() || !medicalJustification.trim()) {
      alert('אנא הוסף הצדקה לשני התרחישים');
      return;
    }

    const newChessResponse: IndividualResponse = {
      id: crypto.randomUUID(),
      studentId: studentId.trim(),
      threshold: chessThreshold,
      justification: chessJustification,
      timestamp: Date.now()
    };
    
    const newMedicalResponse: IndividualResponse = {
      id: crypto.randomUUID(),
      studentId: studentId.trim(),
      threshold: medicalThreshold,
      justification: medicalJustification,
      timestamp: Date.now()
    };

    onAddResponse(newChessResponse, newMedicalResponse);
    
    setStudentId('');
    setChessThreshold(5);
    setChessJustification('');
    setMedicalThreshold(5);
    setMedicalJustification('');
  };

  const studentCount = allStudentIds.size;

  return (
    <div className="max-w-7xl mx-auto space-y-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-center mb-2">שלב 1: החלטות אישיות</h1>
        <p className="text-center text-gray-600">
          אנא קרא את שני התרחישים ושלח את החלטותיך האישיות.{' '}
          <span className="font-semibold">{studentCount} סטודנטים</span> שלחו עד כה.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="max-w-sm mx-auto">
            <label className="block text-sm font-medium text-gray-700">שם או מזהה</label>
            <input
              type="text"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="הזן מזהה ייחודי..."
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="text-right">
                <h2 className="text-2xl font-bold mb-2">{SCENARIOS[ScenarioID.CHESS].title}</h2>
                <p className="mb-4">{SCENARIOS[ScenarioID.CHESS].description}</p>
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
                <p className="mb-4">{SCENARIOS[ScenarioID.MEDICAL].description}</p>
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

const StudentView: React.FC<{
  state: AppState;
  onStateChange: (state: AppState) => void;
}> = ({ state, onStateChange }) => {
  const individualResponses = useMemo(() => ({
    [ScenarioID.CHESS]: state.chessResponses,
    [ScenarioID.MEDICAL]: state.medicalResponses,
  }), [state]);

  const handleAddResponse = useCallback((chess: IndividualResponse, medical: IndividualResponse) => {
    onStateChange({
      ...state,
      chessResponses: [...state.chessResponses, chess],
      medicalResponses: [...state.medicalResponses, medical]
    });
  }, [state, onStateChange]);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gray-50" dir="rtl">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">כלי לימודי לפולריזציה קבוצתית</h1>
        <p className="text-gray-600">תצוגת סטודנט</p>
        <div className="mt-4 inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
          שלב נוכחי: {PHASE_NAMES[state.phase]}
        </div>
      </header>
      
      <main>
        {state.phase === Phase.INDIVIDUAL_INPUT ? (
          <IndividualPhase responses={individualResponses} onAddResponse={handleAddResponse} />
        ) : (
          <Card className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">ממתין לשלב הבא</h2>
            <p className="text-gray-600">
              התשובות שלך נקלטו. אנא המתן למרצה להעביר לשלב הבא.
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
  const [activeTab, setActiveTab] = useState<'overview' | 'responses' | 'groups'>('overview');
  
  const responses = useMemo(() => ({
    [ScenarioID.CHESS]: state.chessResponses,
    [ScenarioID.MEDICAL]: state.medicalResponses,
  }), [state]);

  const allStudents = useMemo(() => {
    const studentIds = new Set<string>();
    Object.values(responses).forEach(arr => arr.forEach(r => studentIds.add(r.studentId)));
    return Array.from(studentIds);
  }, [responses]);

  const createAutoGroups = (groupSize: number) => {
    const shuffled = [...allStudents].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = [];
    
    for (let i = 0; i < shuffled.length; i += groupSize) {
      const members = shuffled.slice(i, i + groupSize);
      newGroups.push({
        id: crypto.randomUUID(),
        name: `קבוצה ${newGroups.length + 1}`,
        memberIds: members,
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">לוח בקרה למרצה</h1>
        <p className="text-gray-600">עקוב אחר התקדמות הסטודנטים ונהל את התרגיל</p>
      </div>

      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">בקרת התרגיל</h2>
        <div className="flex items-center gap-4 mb-4">
          <span className="font-medium">שלב נוכחי:</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
            {PHASE_NAMES[state.phase]}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => onStateChange({ ...state, phase: Phase.INDIVIDUAL_INPUT })}>
            שלב 1: קלט אישי
          </Button>
          <Button onClick={() => onStateChange({ ...state, phase: Phase.GROUP_FORMATION })}>
            שלב 2: הקמת קבוצות
          </Button>
          <Button onClick={() => onStateChange({ ...state, phase: Phase.GROUP_DELIBERATION })}>
            שלב 3: דיון קבוצתי
          </Button>
          <Button onClick={() => onStateChange({ ...state, phase: Phase.RESULTS_DEBRIEF })}>
            שלב 4: תוצאות
          </Button>
          <Button variant="danger" onClick={handleRestart}>
            התחל מחדש
          </Button>
        </div>
      </Card>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-reverse space-x-8">
          {(['overview', 'responses', 'groups'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' ? 'סקירה כללית' : tab === 'responses' ? 'תשובות' : 'קבוצות'}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-lg font-semibold mb-2">סטודנטים</h3>
            <p className="text-3xl font-bold text-blue-600">{allStudents.length}</p>
            <p className="text-sm text-gray-600">סה״כ משתתפים</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold mb-2">קבוצות</h3>
            <p className="text-3xl font-bold text-green-600">{state.groups.length}</p>
            <p className="text-sm text-gray-600">קבוצות שהוקמו</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold mb-2">השלמה</h3>
            <p className="text-3xl font-bold text-purple-600">
              {state.groups.filter(g => g.consensus[ScenarioID.CHESS] && g.consensus[ScenarioID.MEDICAL]).length}
            </p>
            <p className="text-sm text-gray-600">קבוצות שהשלימו</p>
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
                    {responses[scenarioId as ScenarioID]?.map(response => (
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">ניהול קבוצות</h3>
              <div className="flex gap-2">
                <Button onClick={() => createAutoGroups(3)}>יצירה אוטומטית (3)</Button>
                <Button onClick={() => createAutoGroups(4)}>יצירה אוטומטית (4)</Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.groups.map(group => (
              <Card key={group.id}>
                <h4 className="font-bold text-lg mb-2">{group.name}</h4>
                <p className="text-sm text-gray-600">חברים: {group.memberIds.join(', ')}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============= MAIN APP =============
const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    phase: Phase.INDIVIDUAL_INPUT,
    chessResponses: [],
    medicalResponses: [],
    groups: []
  });

  const [view, setView] = useState<'student' | 'professor'>('student');

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/professor')) {
      setView('professor');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'student' ? (
        <StudentView state={state} onStateChange={setState} />
      ) : (
        <ProfessorDashboard state={state} onStateChange={setState} />
      )}
    </div>
  );
};

export default App;