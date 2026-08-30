import { scaleTime } from 'd3-scale';
import { timeDay } from 'd3-time';
import { timeFormat } from 'd3-time-format';
import React, { ReactElement, useEffect, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';

export interface IDatum {
 date: Date;
 value: number ;
 value2?: number;
 value3?: number;
}

interface SingluarAndPluralText {
  singular: string;
  plural: string;
}

interface Props {
  data: Array<IDatum>;
  concepts?: Record<string, SingluarAndPluralText>;
  height?: number;
}

export const getTicks = (data: IDatum[]): number[] => {
  if (!data.length) return [];
  const domain = [new Date(Math.min(
    +data[0].date,
    +data[data.length - 1].date - 7889400000 // 3 months in case less data
  )), Math.max(+data[data.length - 1].date, +new Date())];
  const scale = scaleTime().domain(domain).range([0, 1]);
  const ticks = scale.ticks(timeDay);
  return ticks.map(entry => +entry);
};

export const tickFormat = timeFormat('%d %b');
export const dateFormat = (time: Date): string => tickFormat(new Date(time));

export const getTicksData = (data: IDatum[], ticks: number[]): IDatum[] => {
  // Date is returned in ISO format. Ticks are shown in IST. 19800000 (+5.30) does the IST, ISO adjustments
  const dataMap = new Map(data.map((i) => [+i.date - 19800000, i]));
  const data2: IDatum[] = [];
  ticks.forEach((item) => {
    if (!dataMap.has(item)) data2.push({ date: new Date(item), value: 0 });
    else data2.push(dataMap.get(item)!);
  });
  return data2;
};

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
      {payload.value2 && (
        <>
          <code><b>{payload.value2}</b></code> {value2Text}
        </>
      )}
      <br />
      on&nbsp;&nbsp;&nbsp;<code><b>{day}</b></code>
    </div>
  );
}

export default function Line(props: Props): ReactElement {
  const [ticks, setTicks] = useState<number[]>([]);
  const [zeroFilledData, setZeroFilledData] = useState<IDatum[]>([]);

  useEffect(() => {
    const ticksArr = getTicks(props.data);
    const completeData = getTicksData(props.data, ticksArr);
    setTicks(ticksArr);
    setZeroFilledData(completeData);
  }, [props.data]);

  return (
    <ResponsiveContainer width="100%" height={160} debounce={3}>
      <ComposedChart
        height={props.height ?? 160}
        data={zeroFilledData}
        margin={{ top: 10, bottom: 20, left: 10, right: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          angle={-45}
          textAnchor="end"
          dataKey="date"
          xAxisId="x"
          ticks={ticks}
          axisLine={{ stroke: '#747474' }}
          tick={{ fill: '#747474', fontSize: 'x-small' }}
          tickCount={ticks.length / 2}
          tickFormatter={dateFormat}
        />
        <Tooltip content={<CustomTooltip concepts={props.concepts} />} />
        <Area yAxisId="area" xAxisId="x" type="monotone" dataKey="value" fill="#7567ff47" stroke="#7567ff" strokeWidth={2} isAnimationActive={false} />

        <YAxis yAxisId="area" type="number" dataKey="value" hide />
        <YAxis yAxisId="size" type="number" dataKey="value3" reversed hide />
        <ZAxis zAxisId="size" type="number" dataKey="value2" range={[1, 200]} />
        <Scatter yAxisId="size" zAxisId="size" xAxisId="x" fill="#7567ffbf" />
      </ComposedChart>

    </ResponsiveContainer>
  );
}
