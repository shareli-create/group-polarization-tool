import { ScenarioID, Phase } from './types';

// Scenario Definitions
export const SCENARIOS: Record<ScenarioID, { 
  title: string; 
  description: string; 
  question: string;
  shortName: string;
}> = {
  [ScenarioID.CHESS]: {
    title: "תרחיש השחמט",
    shortName: "שחמט",
    description: "דוד, שחקן שחמט מוכשר, משתתף בתחרות שחמט ארצית. במשחק בשלב המוקדם הוא מוגרל למשחק כנגד השחקן שמדורג ראשון בתחרות. דירוגו של דוד נמוך בהרבה. במהלך המשחק דוד חושב על תכסיס מבריק שעשוי להוביל אותו לניצחון מהיר. אולם, אם התרגיל יכשל, דוד יישאר בעמדה חשופה ואז ההפסד כמעט בטוח.",
    question: "דמיינ/י שאת/ה מייעץ לדוד מה לעשות. מהי ההסתברות הנמוכה ביותר שהתכסיס יצליח שאם היא תתקיים תייעץ לדוד לנסות את התכסיס? צריך להיות סיכוי של ___ ל-10 שהתכסיס יצליח טרם אייעץ לדוד לנסות אותו."
  },
  [ScenarioID.MEDICAL]: {
    title: "התרחיש הרפואי",
    shortName: "רפואי",
    description: "גלית, שנישאה לא מזמן, גילתה לאחרונה במסגרת בדיקה רפואית שיש לה פגם בלב שמסכן את חייה מאד בזמן הריון ולידה. בתור ילדה יחידה היא תמיד קיוותה לגדל מספר ילדים. הרופא אמר לה שניתן לבצע ניתוח עדין אשר באם יצליח הבעיה תיפטר לחלוטין. אולם, ההצלחה של הניתוח איננה מובטחת ולמעשה הניתוח עשוי לגרום למוות.",
    question: "דמיינ/י שאת/ה מייעץ לגלית מה לעשות. מהי ההסתברות הנמוכה ביותר שהניתוח יצליח שאם היא תתקיים תייעץ לגלית לעבור את הניתוח? צריך להיות סיכוי של ___ ל-10 שהניתוח יצליח טרם אייעץ לגלית לעבור אותו."
  }
};

// Phase Names
export const PHASE_NAMES: Record<Phase, string> = {
  [Phase.INDIVIDUAL_INPUT]: 'קלט אישי',
  [Phase.GROUP_FORMATION]: 'הקמת קבוצות',
  [Phase.GROUP_DELIBERATION]: 'דיון קבוצתי',
  [Phase.RESULTS_DEBRIEF]: 'תוצאות וניתוח'
};

// UI Text Constants
export const UI_TEXT = {
  // Common
  submit: 'שלח',
  cancel: 'ביטול',
  save: 'שמור',
  delete: 'מחק',
  edit: 'ערוך',
  close: 'סגור',
  confirm: 'אישור',
  back: 'חזור',
  next: 'הבא',
  finish: 'סיום',
  loading: 'טוען...',
  error: 'שגיאה',
  success: 'הצלחה',
  
  // Student View
  student: {
    title: 'כלי לימודי לפולריזציה קבוצתית',
    subtitle: 'תצוגת סטודנט',
    phase1Title: 'שלב 1: החלטות אישיות',
    phase1Description: 'אנא קרא את שני התרחישים ושלח את החלטותיך האישיות.',
    studentIdLabel: 'שם או מזהה',
    studentIdPlaceholder: 'הזן מזהה ייחודי...',
    thresholdLabel: 'סף הסתברות',
    justificationPlaceholder: 'הצדק בקצרה את תשובתך...',
    submitButton: 'שלח את ההחלטות שלי',
    studentsSubmitted: 'סטודנטים שלחו עד כה',
    waitingTitle: 'ממתין לשלב הבא',
    waitingMessage: 'התשובות שלך נקלטו. אנא המתן למרצה להעביר לשלב הבא.',
    currentPhase: 'שלב נוכחי',
  },
  
  // Professor View
  professor: {
    title: 'לוח בקרה למרצה',
    subtitle: 'עקוב אחר התקדמות הסטודנטים ונהל את התרגיל',
    exerciseControl: 'בקרת התרגיל',
    currentPhase: 'שלב נוכחי',
    phase1Button: 'שלב 1: קלט אישי',
    phase2Button: 'שלב 2: הקמת קבוצות',
    phase3Button: 'שלב 3: דיון קבוצתי',
    phase4Button: 'שלב 4: תוצאות',
    restartButton: 'התחל מחדש',
    
    // Tabs
    overviewTab: 'סקירה כללית',
    responsesTab: 'תשובות',
    groupsTab: 'קבוצות',
    analysisTab: 'ניתוח',
    
    // Overview
    studentsCount: 'סטודנטים',
    totalParticipants: 'סה״כ משתתפים',
    groupsCount: 'קבוצות',
    groupsFormed: 'קבוצות שהוקמו',
    completionCount: 'השלמה',
    groupsCompleted: 'קבוצות שהשלימו',
    
    // Responses
    studentIdColumn: 'מזהה סטודנט',
    thresholdColumn: 'סף',
    justificationColumn: 'הצדקה',
    
    // Groups
    groupManagement: 'ניהול קבוצות',
    autoCreate3: 'יצירה אוטומטית (3)',
    autoCreate4: 'יצירה אוטומטית (4)',
    ungroupedStudents: 'סטודנטים ללא קבוצה',
    members: 'חברים',
    
    // Analysis
    analysisTitle: 'ניתוח יופיע כאן לאחר דיוני הקבוצות',
    analysisMessage: 'הקבוצות צריכות להשלים את הקונצנזוס שלהן כדי לראות ניתוח',
    preDiscussionMean: 'ממוצע לפני דיון',
    groupConsensus: 'קונצנזוס קבוצתי',
    shift: 'שינוי',
    status: 'סטטוס',
    polarized: 'מקוטב',
    extremityShift: 'שינוי קיצוניות',
    normal: 'רגיל',
  },
  
  // Analysis
  analysis: {
    moreExtreme: 'קיצוני יותר',
    lessExtreme: 'קיצוני פחות',
    noChange: 'ללא שינוי',
    riskSeeking: 'מחפש סיכון',
    riskAverse: 'נמנע מסיכון',
    none: 'ללא',
  },
  
  // Alerts
  alerts: {
    enterName: 'אנא הזן את שמך או מזהה',
    alreadySubmitted: 'מזהה זה כבר שלח תשובה',
    provideJustification: 'אנא הוסף הצדקה לשני התרחישים',
    confirmRestart: 'האם אתה בטוח שברצונך להתחיל מחדש? כל הנתונים יימחקו.',
  },
  
  // Error Messages
  errors: {
    loadFailed: 'טעינת הנתונים נכשלה',
    saveFailed: 'שמירת הנתונים נכשלה',
    networkError: 'שגיאת רשת. אנא בדוק את החיבור שלך.',
  }
};

// Group Names Templates
export const GROUP_NAME_TEMPLATES = [
  'קבוצה {n}',
  'צוות {n}',
  'כיתה {n}',
  'חבורה {n}'
];

// Analysis Thresholds
export const ANALYSIS_THRESHOLDS = {
  minimalShift: 0.1,      // Minimum shift to be considered
  polarizationShift: 0.5,  // Shift magnitude for polarization
  extremityMargin: 0.1     // Margin for extremity detection
};

// Color Scheme
export const COLORS = {
  primary: '#3B82F6',      // Blue
  secondary: '#10B981',    // Green
  danger: '#EF4444',       // Red
  warning: '#F59E0B',      // Amber
  info: '#06B6D4',         // Cyan
  success: '#22C55E',      // Green
};

// Chart Configuration
export const CHART_CONFIG = {
  histogramBins: 10,
  scatterPointSize: 100,
  chartHeight: 400,
  animationDuration: 500
};