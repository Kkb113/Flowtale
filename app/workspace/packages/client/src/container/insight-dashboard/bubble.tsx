import { timeFormat } from 'd3-time-format';
import React, { ReactElement, useEffect, useState } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip, XAxis,
  YAxis,
  ZAxis
} from 'recharts';
import { IDatum, dateFormat, getTicks, getTicksData } from './line';

interface SingluarAndPluralText {
  singular: string;
  plural: string;
}

interface Props {
  data: Array<IDatum>;
  concepts?: Record<string, SingluarAndPluralText>;
  height?: number;
}

function CustomTooltip(props: any) {
  if (!(props.active && props.payload && props.payload.length)) return null;
  const payload = props.payload[0].payload;
  const day = timeFormat('%d %b %Y')(payload.date);
  let valueText = '';
  let value2Text = '';
  if (props.concepts && props.concepts.value) {
    valueText = payload.value > 1 ? props.concepts.value.plural : props.concepts.value.singular;
  }
  if (props.concepts && props.concepts.value2) {
    value2Text = payload.value2 > 1 ? props.concepts.value2.plural : props.concepts.value2.singular;
  }
  return (
    <div
      style={{
        background: '#808080a6',
        padding: '0.5rem 0.75rem',
        fontSize: '0.85rem',
        borderRadius: '8px',
        color: 'white',
        backdropFilter: 'blur(2px)'
      }}
    >
      <code><b>{payload.value}</b></code> {valueText}
      <br />
      {value2Text && (
        <>
          <code><b>{payload.value2}</b></code> {value2Text}
        </>
      )}
      <br />
      on&nbsp;&nbsp;&nbsp;<code><b>{day}</b></code>
    </div>
  );
}

export default function Bubble(props: Props): ReactElement {
  const [ticks, setTicks] = useState<number[]>([]);
  const [zeroFilledData, setZeroFilledData] = useState<IDatum[]>([]);

  useEffect(() => {
    const ticksArr = getTicks(props.data);
    const completeData = getTicksData(props.data, ticksArr);
    setTicks(ticksArr);
    setZeroFilledData(completeData);
  }, [props.data]);

  return (
    <ResponsiveContainer width="100%" height={80} debounce={3}>
      <ScatterChart
        height={props.height ?? 80}
        data={zeroFilledData}
        margin={{
          top: 30,
          left: 30,
          right: 30
        }}
      >
        <CartesianGrid stroke="1" />
        <XAxis
          angle={-45}
          textAnchor="end"
          dataKey="date"
          ticks={ticks}
          tickLine={false}
          axisLine={{ stroke: 'lightgray', strokeDasharray: '3 2' }}
          tick={false}
          tickCount={ticks.length / 4}
          tickFormatter={dateFormat}
        />
        <Tooltip content={<CustomTooltip concepts={props.concepts} />} />
        <YAxis type="number" dataKey="value2" reversed hide />
        <ZAxis type="number" dataKey="value" range={[1, 600]} domain={['auto', 'auto']} />
        <Scatter fill="#7567ffbf" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
