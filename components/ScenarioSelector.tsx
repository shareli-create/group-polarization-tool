
import React from 'react';
import { ScenarioID } from '../types';
import { SCENARIOS } from '../constants';
import Card from './ui/Card';

interface ScenarioSelectorProps {
  onSelect: (scenarioId: ScenarioID) => void;
}

const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({ onSelect }) => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Group Polarization Classroom Tool</h1>
      <p className="text-xl text-gray-600 mb-8">Select a scenario to begin the exercise.</p>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {(Object.keys(SCENARIOS) as ScenarioID[]).map(key => (
          <Card key={key} className="text-right cursor-pointer hover:shadow-xl hover:border-blue-500 border-2 border-transparent transition-all duration-300 transform hover:-translate-y-1">
            <button onClick={() => onSelect(key)} className="w-full h-full text-left p-4">
              <h2 className="text-2xl font-bold text-blue-700 mb-2">{SCENARIOS[key].title}</h2>
              <p className="text-gray-700">{SCENARIOS[key].description}</p>
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ScenarioSelector;
