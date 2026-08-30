import React, { ReactElement, useEffect, useState } from 'react';
import { BarChart, Bar as BarMark, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface IDatum {
 x: number | string;
 y: number ;
}

interface Props {
  noPad?: boolean;
  xs: (number | string)[];
  ys: number[];
  conceptX: string;
  conceptY: string;
  height?: number;
  bg?: string;
}

function CustomTooltip(props: any) {
  if (!(props.active && props.payload && props.payload.length)) return null;
  const payload = props.payload[0].payload;
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
      <code><b>{Math.ceil(payload.y)}</b></code> {props.conceptY}
      <br />
      <code><b>{payload.x}</b></code> {props.conceptX}
    </div>
  );
}

export default function Bar(props: Props): ReactElement {
  const [data, setData] = useState<IDatum[]>([]);

  useEffect(() => {
    const d: IDatum[] = [];
    for (let i = 0; i < props.xs.length; i++) {
      d.push({
        x: props.xs[i],
        y: props.ys[i]
      });
    }
    setData(d);
  }, [props.xs, props.ys]);

  const bg = props.bg ?? '#7567ff';
  const axisLineColors = props.bg ?? '#160245';
  return (
    <ResponsiveContainer width="100%" height={props.height ?? 140} debounce={3}>
      <BarChart
        height={props.height ?? 160}
        data={data}
        margin={{
          top: props.noPad ? 4 : 10,
          bottom: props.noPad ? 16 : 20,
          left: props.noPad ? 4 : 50,
          right: props.noPad ? 4 : 50
        }}
        barGap={0}
        barCategoryGap={0}
      >
        <XAxis
          angle={-45}
          textAnchor="end"
          dataKey="x"
          axisLine={{ stroke: axisLineColors }}
          tick={{ fill: axisLineColors, fontSize: 'x-small' }}
        />
        <Tooltip content={<CustomTooltip conceptX={props.conceptX} conceptY={props.conceptY} />} />
        <BarMark dataKey="y" fill={bg} stroke="white" strokeWidth={1} />
      </BarChart>

    </ResponsiveContainer>
  );
}
