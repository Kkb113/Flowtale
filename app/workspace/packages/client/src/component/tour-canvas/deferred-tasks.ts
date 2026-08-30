export const enum LS_KEYS {
  ZoomPan = 'zp',
}

interface StoredObj {
  k: string,
  v: string
}

export function dSaveZoomPanState(forTour: string): {
    set: (k: number, x: number, y: number) => void,
    get: ()=> [k: number | null, x: number | null, y: number | null]
    getValueFromBuffer: ()=> [k: number | null, x: number | null, y: number | null]
} {
  let timer = 0;
  let buffer = '';
  return {
    set: (k: number, x: number, y: number) => {
      buffer = `${k},${x},${y}`;
      if (!timer) {
        timer = setTimeout(() => {
          const savedVal = localStorage.getItem(LS_KEYS.ZoomPan) || '[]';
          const tSavedVal = JSON.parse(savedVal) as StoredObj[];

          const data: StoredObj = { k: forTour, v: buffer };

          let idx;
          if ((idx = tSavedVal.findIndex(v => v.k === forTour)) === -1) {
            tSavedVal.push(data);
          } else {
            tSavedVal.splice(idx, 1);
            tSavedVal.push(data);
          }
          // Don't let the key grow unbounded, we are keeping zoom pan state for 50 tours
          if (tSavedVal.length >= 15) {
            tSavedVal.shift();
          }

          // extra 8({"":""},) chars (8byte) per key (8 * 15 tours = 400byte max) is getting stored. but that's okay.
          localStorage.setItem(LS_KEYS.ZoomPan, JSON.stringify(tSavedVal));
          buffer = '';
          clearTimeout(timer);
          timer = 0;
        }, 750) as unknown as number;
      }
    },
    getValueFromBuffer() {
      if (!buffer) {
        return this.get();
      }
      return buffer.split(',').map(d => +d) as [number, number, number];
    },
    get: () => {
      const savedVal = localStorage.getItem(LS_KEYS.ZoomPan);
      if (!savedVal) return [null, null, null];

      const obj = JSON.parse(savedVal) as StoredObj[];
      const idx = obj.findIndex(v => v.k === forTour);
      if (idx === -1) return [null, null, null];
      return obj[idx].v.split(',').map(d => +d) as [number, number, number];
    }
  };
}
