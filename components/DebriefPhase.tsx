import React, { useState, useMemo } from 'react';
import { Group, IndividualResponse, AnalysisResult, ScenarioID } from '../types';
import { analyzeGroupShift, calculateMean } from '../services/analysisService';
import { SCENARIOS } from '../constants';
import Card from './ui/Card';
import Button from './ui/Button';
import Histogram from './Histogram';

// @ts-ignore
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line } from 'recharts';


const ShiftArrow: React.FC<{ mean: number; consensus: number }> = ({ mean, consensus }) => {
    // Scale 1-10 to fit in a 90-unit range (from 5 to 95)
    const scale = (val: number) => 5 + ((val - 1) / 9) * 90; 
    const startX = scale(mean);
    const endX = scale(consensus);
    const color = consensus > mean ? 'text-red-500' : consensus < mean ? 'text-blue-500' : 'text-gray-500';
    
    return (
        <svg width="100%" height="40" viewBox="0 0 100 15" className="mt-2">
            <line x1="5" y1="10" x2="95" y2="10" stroke="#ccc" strokeDasharray="2 2" />
            {Array.from({length: 10}).map((_, i) => (
                 <line key={i} x1={scale(i + 1)} y1="8" x2={scale(i + 1)} y2="12" stroke="#ccc" />
            ))}
            <line x1={startX} y1="5" x2={endX} y2="5" stroke="currentColor" strokeWidth="1.5" className={color} markerEnd="url(#arrowHead)" />
            <circle cx={startX} cy="5" r="1.5" fill="currentColor" className={color} />
            <defs>
                <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className={color} />
                </marker>
            </defs>
        </svg>
    );
};

const GroupAnalysisCard: React.FC<{ group: Group, analysis: AnalysisResult, preDiscussionMean: number, consensusThreshold: number }> = ({ group, analysis, preDiscussionMean, consensusThreshold }) => (
    <Card>
        <h3 className="text-xl font-bold">{group.name}</h3>
        <div className="flex justify-between items-baseline text-sm text-gray-600 mt-1">
            <span>Pre-discussion Mean: <span className="font-semibold">{preDiscussionMean.toFixed(2)}</span></span>
            <span>Group Consensus: <span className="font-semibold">{consensusThreshold.toFixed(1)}</span></span>
        </div>
        <ShiftArrow mean={preDiscussionMean} consensus={consensusThreshold} />
        <div className="mt-4 text-sm space-y-2">
            <p><strong>Feedback:</strong> Your pre-discussion average was {preDiscussionMean.toFixed(2)}; after discussion your group consensus was {consensusThreshold.toFixed(1)} (a shift of {analysis.shift.toFixed(2)} points).</p>
            <p>This shift was <strong className={analysis.shiftDirection === 'more extreme' ? 'text-red-600' : 'text-blue-600'}>{analysis.shiftDirection}</strong>. What led to this shift?</p>
            {analysis.isPolarized && <p className="p-2 bg-yellow-100 text-yellow-800 rounded-md">🚩 <strong>Polarization Detected:</strong> The group's final decision was more extreme than its initial average.</p>}
            {analysis.isExtremityShift && <p className="p-2 bg-red-100 text-red-800 rounded-md">🚨 <strong>Extremity Shift:</strong> The group's consensus ({consensusThreshold.toFixed(1)}) went beyond any initial member's response ({analysis.extremityShiftInfo}).</p>}
        </div>
    </Card>
);

const MetaChart: React.FC<{chartData: any[]}> = ({ chartData }) => {
    return (
        <div className="w-full h-96">
            <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="x" name="Pre-Discussion Mean" domain={[1, 10]} label={{ value: 'Pre-Discussion Mean', position: 'insideBottom', offset: -10 }} />
                    <YAxis type="number" dataKey="y" name="Group Consensus" domain={[1, 10]} label={{ value: 'Group Consensus', angle: -90, position: 'insideLeft', offset: -10 }}/>
                    <ZAxis type="number" dataKey="z" range={[100, 500]} name="Group Size" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Groups" data={chartData} fill="#8884d8" />
                     <Line type="monotone" dataKey="y" stroke="transparent" dot={false} activeDot={false} legendType="none" />
                    <Line type="monotone" dataKey="x" stroke="#ccc" strokeDasharray="5 5" dot={false} activeDot={false} name="Line of No Change" />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};

const ScenarioAnalysisTab: React.FC<{
    scenarioId: ScenarioID;
    groups: Group[];
    individualResponses: IndividualResponse[];
}> = ({ scenarioId, groups, individualResponses }) => {
    const scenario = SCENARIOS[scenarioId];
    
    const analyses = useMemo(() => groups.map(group => {
        const groupResponses = individualResponses.filter(r => group.memberIds.includes(r.studentId));
        const initialThresholds = groupResponses.map(r => r.threshold);
        const preDiscussionMean = calculateMean(initialThresholds);
        const consensus = group.consensus[scenarioId];
        
        if (!consensus || initialThresholds.length === 0) return null;

        const analysis = analyzeGroupShift(preDiscussionMean, consensus.threshold, initialThresholds);
        return { group, analysis, preDiscussionMean, consensusThreshold: consensus.threshold };
    }).filter(item => item !== null), [groups, individualResponses, scenarioId]);

    const riskSeekingGroups = analyses.filter(a => a!.analysis.shiftType === 'risk-seeking').length;
    const riskAverseGroups = analyses.filter(a => a!.analysis.shiftType === 'risk-averse').length;
    let overallShift = 'a mix of directions';
    if (riskSeekingGroups > riskAverseGroups && riskAverseGroups === 0) overallShift = 'risk-seeking';
    if (riskAverseGroups > riskSeekingGroups && riskSeekingGroups === 0) overallShift = 'risk-aversion';
    
    const sampleRationale = groups.find(g => g.consensus[scenarioId]?.justification)?.consensus[scenarioId]?.justification;

    const chartData = analyses.map(a => ({
        x: a!.preDiscussionMean,
        y: a!.consensusThreshold,
        z: a!.group.memberIds.length,
        name: a!.group.name
    }));

    return (
        <div className="space-y-6">
             <Card>
                <h3 className="text-2xl font-semibold mb-4 text-center">Class-Level Summary</h3>
                <p className="text-center mb-4">For the <strong>{scenario.title}</strong>, most groups shifted toward <strong>{overallShift}</strong>. An example of a group's rationale was: <em>"{sampleRationale || 'No rationales provided.'}"</em></p>
                <p className="text-center text-gray-600">What social or informational dynamics might explain these shifts?</p>
                <MetaChart chartData={chartData} />
                <p className="text-xs text-center text-gray-500 mt-2">The diagonal line represents no change between the pre-discussion mean and the final group consensus.</p>
            </Card>

            <Card>
                <h3 className="text-2xl font-semibold mb-4 text-center">Initial Response Distribution</h3>
                <Histogram data={individualResponses} />
            </Card>

            <div>
                <h3 className="text-2xl font-semibold mb-4 text-center">Individual Group Diagnostics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {analyses.map(a => a && (
                        <GroupAnalysisCard key={a.group.id} {...a} />
                    ))}
                </div>
            </div>
        </div>
    );
};


const DebriefPhase: React.FC<{ 
    groups: Group[], 
    individualResponses: Record<ScenarioID, IndividualResponse[]>, 
    onRestart: () => void 
}> = ({ groups, individualResponses, onRestart }) => {
    const [activeTab, setActiveTab] = useState<ScenarioID>(ScenarioID.CHESS);

    const exportData = () => {
        const data = { individualResponses, groups };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "polarization_data.json";
        link.click();
    };


    return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Phase 4: Results & Debrief</h2>
        <p className="text-gray-600 mt-2">Analysis of group shifts and overall class trends for each scenario.</p>
      </div>
      
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
            {(Object.keys(SCENARIOS) as ScenarioID[]).map(id => (
                <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`${
                        activeTab === id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    {SCENARIOS[id].title}
                </button>
            ))}
        </nav>
      </div>

      <div>
        <ScenarioAnalysisTab 
            scenarioId={activeTab}
            groups={groups}
            individualResponses={individualResponses[activeTab]}
        />
      </div>
      
      <div className="text-center py-6">
        <Button onClick={exportData} variant="secondary" className="mr-4">Export All Data (JSON)</Button>
        <Button onClick={onRestart}>Start New Session</Button>
      </div>
    </div>
  );
};

export default DebriefPhase;