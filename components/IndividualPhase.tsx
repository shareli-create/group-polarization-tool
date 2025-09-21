import React, { useState } from 'react';
import { IndividualResponse, ScenarioID } from '../types';
import { SCENARIOS } from '../constants';
import Card from './ui/Card';
import Button from './ui/Button';
import Slider from './ui/Slider';

interface IndividualPhaseProps {
  onComplete: () => void;
  responses: Record<ScenarioID, IndividualResponse[]>;
  onAddResponse: (newChessResponse: IndividualResponse, newMedicalResponse: IndividualResponse) => void;
}

const ScenarioInput: React.FC<{
  scenarioId: ScenarioID;
  threshold: number;
  justification: string;
  onThresholdChange: (val: number) => void;
  onJustificationChange: (val:string) => void;
}> = ({ scenarioId, threshold, justification, onThresholdChange, onJustificationChange }) => {
  const scenario = SCENARIOS[scenarioId];
  return (
    <Card>
      <div dir="rtl" className="text-right">
        <h2 className="text-2xl font-bold mb-2">{scenario.title}</h2>
        <p className="mb-4">{scenario.description}</p>
        <p className="font-semibold">{scenario.question}</p>
      </div>
      <div className="mt-4 space-y-4">
        <Slider label="Probability Threshold" value={threshold} onChange={onThresholdChange} />
        <textarea
          value={justification}
          onChange={(e) => onJustificationChange(e.target.value)}
          placeholder="Briefly justify your answer..."
          className="w-full p-2 border border-gray-300 rounded-md"
          rows={3}
        />
      </div>
    </Card>
  );
};

const IndividualPhase: React.FC<IndividualPhaseProps> = ({ onComplete, responses, onAddResponse }) => {
  const [studentId, setStudentId] = useState('');
  const [chessThreshold, setChessThreshold] = useState(5);
  const [chessJustification, setChessJustification] = useState('');
  const [medicalThreshold, setMedicalThreshold] = useState(5);
  const [medicalJustification, setMedicalJustification] = useState('');

  const allStudentIds = new Set(responses[ScenarioID.CHESS].map(r => r.studentId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      alert('Please enter your name or ID.');
      return;
    }
    if (allStudentIds.has(studentId.trim())) {
      alert('This ID has already submitted a response.');
      return;
    }
    if (!chessJustification.trim() || !medicalJustification.trim()) {
        alert('Please provide a justification for both scenarios.');
        return;
    }

    const newChessResponse: IndividualResponse = {
      id: crypto.randomUUID(),
      studentId: studentId.trim(),
      threshold: chessThreshold,
      justification: chessJustification,
    };
    const newMedicalResponse: IndividualResponse = {
        id: crypto.randomUUID(),
        studentId: studentId.trim(),
        threshold: medicalThreshold,
        justification: medicalJustification,
      };

    onAddResponse(newChessResponse, newMedicalResponse);

    // Reset form
    setStudentId('');
    setChessThreshold(5);
    setChessJustification('');
    setMedicalThreshold(5);
    setMedicalJustification('');
  };

  const studentCount = allStudentIds.size;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-center mb-2">Phase 1: Individual Decisions</h1>
        <p className="text-center text-gray-600">Please read both scenarios and submit your individual decisions below. <span className="font-semibold">{studentCount} student(s)</span> have submitted so far.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="max-w-sm mx-auto">
                 <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">Your Name or ID</label>
                 <input
                    type="text"
                    id="studentId"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a unique identifier..."
                    required
                 />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScenarioInput 
                    scenarioId={ScenarioID.CHESS}
                    threshold={chessThreshold}
                    justification={chessJustification}
                    onThresholdChange={setChessThreshold}
                    onJustificationChange={setChessJustification}
                />
                 <ScenarioInput 
                    scenarioId={ScenarioID.MEDICAL}
                    threshold={medicalThreshold}
                    justification={medicalJustification}
                    onThresholdChange={setMedicalThreshold}
                    onJustificationChange={setMedicalJustification}
                />
            </div>
            <div className="text-center">
                <Button type="submit" variant="primary">Submit My Decisions</Button>
            </div>
        </form>
      </Card>
      
      <div className="text-center">
        <Button onClick={onComplete} disabled={studentCount < 2}>
            Finish Individual Phase & Proceed to Group Formation
        </Button>
        {studentCount < 2 && <p className="text-sm text-red-600 mt-2">At least 2 students must submit responses to proceed.</p>}
      </div>
    </div>
  );
};

export default IndividualPhase;