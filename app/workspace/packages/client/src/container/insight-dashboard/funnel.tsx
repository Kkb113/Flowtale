/* eslint-disable no-mixed-operators */
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { HistogramData } from '../../action/creator';

interface IDatum {
  x: string;
  y: number;
  hist?: HistogramData
}

interface PreparedData {
  x: string;
  yAbs: number;
  yPercentage: number;
  yDropoffPercentage: number;
  label: string;
  hist?: HistogramData;
}

interface Props {
  data: IDatum[];
}

function CustomTooltip(props: any) {
  if (!(props.active && props.payload && props.payload.length)) return null;
  const payload = props.payload[0].payload;
  return (
    <div
      style={{
        background: '#000000a6',
        padding: '0.5rem 0.75rem',
        fontSize: '0.85rem',
        borderRadius: '8px',
        color: 'white',
        display: 'flex',
        gap: '1rem',
        backdropFilter: 'blur(2px)'
      }}
    >
      <div style={{ paddingTop: '1rem' }}>
        <code><b>{payload.x}</b></code>
        <br />
        <code><b>{payload.yAbs}</b></code> Views
        <br />
        <code><b>{Math.ceil(payload.yDropoffPercentage)}%</b></code> Drop
      </div>
      {payload.hist && (
        <table
          key={payload.x}
          style={{
            border: '1px solid #fafafa42',
            fontSize: '11px',
            borderRadius: '8px'
          }}
        >
          <thead>
            <tr style={{ background: '#fafafa42' }}>
              <th>Time spent</th>
              <th>Sessions</th>
            </tr>
          </thead>
          <tbody>
            {payload.hist.bins.map((bin: string, i: number) => (
              <tr key={i}>
                <td>{bin}s</td>
                <td>{payload.hist.freq[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CustomizedLabel(props: any) {
  const { x, y, width, height, stroke, value } = props;
  const [absVal, per, dropoffPercentage] = value.split(':');
  const yx = 25;
  const shouldShow = width >= 70;
  return (
    shouldShow ? (
      <g transform={`translate(${x + width / 2},${yx})`}>
        <rect
          x={-(width - 15) / 2}
          y={-10}
          width={width - 15}
          height="2em"
          fill="#ffffff9c"
          stroke="#ffffff"
          rx="4"
          ry="4"
        />
        <text
          x={0}
          y="-1em"
          fontSize={10}
          textAnchor="middle"
        >
          <tspan x="0" dy="1.2em">{absVal} views</tspan>
          <tspan x="0" dy="1.2em">{dropoffPercentage} drop</tspan>
        </text>;
      </g>
    ) : (
      <></>
    )
  );
}

export default function Funnel(props: Props) {
  const [data, setData] = useState<PreparedData[]>([]);

  useEffect(() => {
    const preparedData = props.data.map((datum, index, arr) => {
      const yAbs = datum.y;
      const yPercentage = ((yAbs / arr[0].y) * 100);
      const yDropoffPercentage = (arr[index > 0 ? index - 1 : 0].y - yAbs) / (arr[0].y ?? 100) * 100;
      const label = `${yAbs}:${Math.round(yPercentage)}%:${Math.round(yDropoffPercentage)}%`;
      return { x: datum.x, yAbs, yPercentage, yDropoffPercentage, label, hist: datum.hist };
    });
    setData(preparedData);
  }, [props.data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid stroke="0" />
        <XAxis dataKey="x" hide />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="yPercentage"
          fill="#7567ff"
          minPointSize={5}
          stackId="default"
          style={{
            filter: 'drop-shadow(#7568ff 1px -1px 1px)'
          }}
        />
        <Bar
          dataKey="yDropoffPercentage"
          fill="#d0d0ff"
          minPointSize={0}
          stackId="default"
          radius={[4, 4, 0, 0]}
          style={{
            filter: 'drop-shadow(#7568ff 1px -1px 1px)'
          }}
        >
          <LabelList dataKey="label" content={<CustomizedLabel />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
