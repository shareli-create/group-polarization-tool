import React from 'react';
import { IndividualResponse } from '../types';
// @ts-ignore
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


interface HistogramProps {
  data: IndividualResponse[];
}

const Histogram: React.FC<HistogramProps> = ({ data }) => {
  const histogramData = Array.from({ length: 10 }, (_, i) => ({
    threshold: `${i + 1}`,
    count: 0,
  }));

  data.forEach(response => {
    const val = response.threshold;
    if (val >= 1 && val <= 10) {
      // Handle the edge case of 10 exactly, which should go in the last bucket.
      const bucketIndex = val === 10 ? 9 : Math.floor(val) - 1;
      if (histogramData[bucketIndex]) {
        histogramData[bucketIndex].count++;
      }
    }
  });

  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <BarChart
          data={histogramData}
          margin={{
            top: 5, right: 30, left: 20, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="threshold" label={{ value: 'Probability Threshold (1-10)', position: 'insideBottom', offset: -5 }} />
          <YAxis allowDecimals={false} label={{ value: 'Number of Students', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#4f46e5" name="Student Responses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Histogram;