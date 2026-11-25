import type {Tool} from './sim';
const paths:Record<Tool|'bell',string>={
 road:'M10 2v7H3v5h7v8m4-20v7h7v5h-7v8',
 bridge:'M2 16h20M4 16v4m16-4v4M3 15c4-9 14-9 18 0M6 12V7m6 3V4m6 8V7',
 home:'m2 11 10-7 10 7M5 10v10h14V10m-9 10v-6h4v6',
 farm:'M3 20h18M3 16h18M12 15V3m0 9c-4-1-6-3-6-6 3 0 5 2 6 4m0 2c4-1 6-3 6-6-3 0-5 2-6 4',
 work:'M3 20h18M5 20V10l7-5 7 5v10m-11-5 4-4 3 3m-3-3 3-1 2 2-2 2m-4 2 3 3',
 market:'M4 11v9m16-9v9M3 20h18M2 10l3-6h14l3 6v2c-2 2-4 2-5 0-2 2-4 2-5 0-2 2-4 2-5 0-2 2-4 2-5 0zM8 4l-1 6m9-6 1 6m-5-6v6',
 inn:'M8 6V4h8v2m-4-2V2M8 18h8v2H8zM7 6h10c3 3 3 8 0 12H7c-3-4-3-9 0-12Zm2 1v10m6-10v10m-3-10v10',
 temple:'M12 2v3M5 9l7-4 7 4m-12 1v4m10-4v4M3 16l9-4 9 4m-15 1v4m12-4v4M4 21h16m-10 0v-4h4v4',
 terrace:'M3 20h18M3 19v-4h5v-4h5V7h5V3h3v16',
 erase:'m5 5 14 14M19 5 5 19',
 rowhouse:'m5 8 7-5 7 5M7 8v13h10V8M9 10h6v4H9zm1 11v-4h4v4',
 stall:'M5 12v9m14-9v9M4 20h16M3 10l3-6h12l3 6v2H3zm5-6-1 6m9-6 1 6M5 16h14',
 lantern:'M12 3v2M6 9l6-4 6 4H6zm3 1v5h6v-5m-6 5h6m-3 0v4m-4 2h8m-6-2h4',
 garden:'M4 20h16M12 20v-7m0 4-4-4m4 3 4-4M8 12c-5 0-4-6 0-6 1-4 7-4 8 0 5 0 5 6 0 6-2 2-6 2-8 0Z',
 plot:'M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4zM10 12h4m-2-2v4',
 bell:'M10 5V3h4v2m-2 0c4 0 6 3 6 7v3l3 3H3l3-3v-3c0-4 2-7 6-7Zm-2 15a2 2 0 0 0 4 0M9 10h6m-7 3h8'
};
export function icon(k:Tool|'bell'){return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round" stroke-linecap="round"><path d="${paths[k]}"/></svg>`;}
