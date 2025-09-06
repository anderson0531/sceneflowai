import React from 'react';

// Helper hook to generate unique IDs (for React 18+)
// This ensures the component can be reused without ID collisions.
const useUniqueId = (prefix: string) => {
  const id = React.useId();
  // Sanitize the ID for use in SVG attributes (remove colons)
  return `${prefix}-${id.replace(/:/g, '')}`;
};

const ClapperIcon = (props: React.SVGProps<SVGSVGElement>) => {
  // Define colors
  const mainColor = "#1f2937"; // Tailwind gray-800
  const highlightColor = "#ffffff";

  // Generate unique IDs for definitions
  const lgHighlight = useUniqueId('lg-highlight');
  const lgBody = useUniqueId('lg-body');
  const filterShadow = useUniqueId('filter-shadow');
  const lgMask = useUniqueId('lg-mask');
  const maskReflection = useUniqueId('mask-reflection');
  
  // Generate unique IDs for transformed gradients
  const lgBodyT = useUniqueId('lg-body-t');
  const lgHighlightT1 = useUniqueId('lg-highlight-t1');
  const lgHighlightT2 = useUniqueId('lg-highlight-t2');
  
  // Generate unique IDs for paths used by textPath
  const pathLine1 = useUniqueId('path-line1');
  const pathLine2 = useUniqueId('path-line2');
  const pathLine3 = useUniqueId('path-line3');

  return (
    <svg
      viewBox="0 0 731.88 776.21"
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      fill="none"
      {...props}
    >
      <defs>
        {/* Base Gradients */}
        <linearGradient id={lgHighlight}>
          <stop stopColor={highlightColor} offset="0" />
          <stop stopColor="#000000" stopOpacity="0" offset="1" />
        </linearGradient>

        <linearGradient id={lgBody}>
          {/* Changed from original near-black to dark gray */}
          <stop stopColor={mainColor} offset="0" />
          <stop stopColor="#999999" stopOpacity="0" offset="1" />
        </linearGradient>

        {/* Drop Shadow Filter */}
        <filter id={filterShadow}>
          <feGaussianBlur stdDeviation="11.168796" />
        </filter>

        {/* Reflection Mask Gradient */}
        <linearGradient
          id={lgMask}
          y2="949.76"
          gradientUnits="userSpaceOnUse"
          x2="431.07"
          gradientTransform="matrix(1 0 0 -1 -117.96 946.68)"
          y1="376.4"
          x1="422.68"
        >
          <stop stopColor="#ffffff" offset="0" />
          <stop stopColor="#000000" offset=".69643" />
          <stop stopColor="#000000" offset="1" />
        </linearGradient>

        {/* Mask Definition */}
        <mask id={maskReflection} maskUnits="userSpaceOnUse">
          <path
            fill={`url(#${lgMask})`}
            d="m-84.695 6.6629l709.6-9.2396 0.01 486.01-691.12 1.85-18.485-478.62z"
          />
        </mask>

        {/* Transformed Gradients (linking to base gradients) */}
        <linearGradient
          id={lgBodyT}
          y2="241.79"
          xlinkHref={`#${lgBody}`}
          gradientUnits="userSpaceOnUse"
          x2="732.34"
          gradientTransform="matrix(.74910 -.036820 .036820 .74910 -42.649 -88.053)"
          y1="296.65"
          x1="172.19"
        />
        <linearGradient
          id={lgHighlightT1}
          y2="260.77"
          xlinkHref={`#${lgHighlight}`}
          gradientUnits="userSpaceOnUse"
          x2="73.513"
          gradientTransform="translate(-13.265 34.833)"
          y1="248.03"
          x1="130.16"
        />
        <linearGradient
          id={lgHighlightT2}
          y2="90.33"
          xlinkHref={`#${lgHighlight}`}
          gradientUnits="userSpaceOnUse"
          x2="36.125"
          gradientTransform="translate(-13.265 34.833)"
          y1="83.384"
          x1="66.228"
        />
      </defs>

      {/* Layer: DropShadow */}
      <g transform="translate(81.209 -34.886)">
        <path
          opacity=".73333"
          fillRule="evenodd"
          filter={`url(#${filterShadow})`}
          stroke="#000000"
          strokeWidth="1px"
          fill="#000000" // Shadow remains black
          transform="matrix(1.0774 -.22779 .15081 .65533 -84.076 227.98)"
          d="m-41.681 312.44l167.88 180.61 350.81-150.51-182.93-125.04-335.76 94.94z"
        />
      </g>

      {/* Layer: Main Content */}
      <g transform="translate(81.209 -34.886)">
        <g transform="translate(-1.8479 29.567)">
          
          {/* Group: Reflection (Masked and Transformed) */}
          <g
            opacity=".78889"
            mask={`url(#${maskReflection})`}
            transform="matrix(.63729 -.77062 -.77062 -.63729 429.81 899.44)"
          >
            {/* Body elements (Reflection) */}
            <path
              fillRule="evenodd"
              stroke={mainColor}
              strokeWidth=".75px"
              fill={`url(#${lgBodyT})`}
              d="m392.46 55.418l-22.39 12.04-323.06 73.452"
            />
             <g fill={mainColor} stroke={mainColor} strokeWidth=".75px" fillRule="evenodd">
                <path d="m47.778 141.76l85.222 342.17 345.57-163.97-77.73-234.17-353.06 55.97z" />
                <path d="m47.616 141.61l-11.307 5.88 84.941 336.83 12.63-0.45" />
                <path d="m46.426 140.83l345.4-85.597-9.93-25.516-348.12 74.173 12.646 36.94z" />
                <path d="m33.661 103.95l-10.426 7.17 12.308 35.25 10.877-5.65-12.759-36.77z" />
            </g>

            {/* White lines and stripes (Reflection) */}
             <g fill={highlightColor} stroke={highlightColor} fillRule="evenodd">
                <path strokeWidth="1.125" d="m68.86 224.26l349.73-84.05 0.12-0.9" />
                <path strokeWidth="1.125" d="m80.808 273.54l350.48-97.06 0.16-0.33" />
                <path strokeWidth="1.2689" d="m96.672 336.4l350.48-115.52-0.06-1.03" />
                <path strokeWidth="1.5" fill="none" d="m224.98 294.44l36.24 128.58-0.04-0.81" />
                <path strokeWidth="1.5" fill="none" d="m348.38 253.39l32.27 112.79 0.2-0.83 0.26 0.23" />
            </g>

            {/* Stripes on bars (Reflection) */}
            <g fill={highlightColor} fillRule="evenodd">
                <g transform="matrix(.74910 -.036820 .036820 .74910 -43.559 -88.053)">
                    <path d="m89.414 260.45l72.266 38.77 35.84-6.87-71.2-37.96-36.906 6.06z" />
                    <path d="m166.19 247.83l70.36 36.29 38.69-7.17-72.07-34.97-36.98 5.85z" />
                    <path d="m245.78 234.8l71.5 34.08 37.47-6.87-74.47-32.86-34.5 5.65z" />
                    <path d="m322.94 222.35l71.34 31.43 39.96-6.86-76.25-29.8-35.05 5.23z" />
                    <path d="m407.16 209.29l65.52 29.36 34.44-6.36-67.36-28.84-32.6 5.84z" />
                    <path d="m480.64 197.1l59.63 28.59 30.2-5.55-60.28-28.07-29.55 5.03z" />
                </g>
                <path d="m58.025 180.03l34.23-45.59 24.215-3.55-33.205 43.8-25.24 5.34z" />
                <path d="m111.49 168.44l35.45-42.19 26.53-4.15-37.24 41.84-24.74 4.5z" />
                <path d="m166.95 156.3l44.01-40.87 28.52-4.73-43.3 39.67-29.23 5.93z" />
                <path d="m224.98 143.83l42.93-37.66 29.9-5.14-44.63 37.07-28.2 5.73z" />
                <path d="m291.71 130.06l38.35-33.575 25.86-4.286-39.77 33.691-24.44 4.17z" />
                <path d="m339.09 120.51l38.73-31.51 22.61-3.743-35.27 30.233-26.07 5.02z" />
            </g>

            {/* Edge highlights (Reflection) */}
            <g stroke={mainColor} strokeWidth=".75px" fillRule="evenodd">
                <path fill={`url(#${lgHighlightT1})`} d="m47.616 141.61l-11.307 5.88 84.941 336.83 12.63-0.45" />
                <path fill={`url(#${lgHighlightT2})`} d="m33.661 103.95l-10.426 7.17 12.308 35.25 10.877-5.65-12.759-36.77z" />
            </g>

            {/* Text Elements (Reflection) - References paths defined in the main group. */}
            <g fill={highlightColor} fontSize="12px" fontFamily="Arial Black, Impact, sans-serif" textAnchor="start">
              <text xmlSpace="preserve" transform="translate(41.893 6.375)">
                <textPath xlinkHref={`#${pathLine3}`}>SCENE</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(176.68 -38.25)">
                <textPath xlinkHref={`#${pathLine3}`}>TAKE</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(295.07 -78.321)">
                <textPath xlinkHref={`#${pathLine3}`}>ROLL</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(4,-4)">
                <textPath xlinkHref={`#${pathLine1}`}>TITLE</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(4,-4)">
                <textPath xlinkHref={`#${pathLine2}`}>PRODUCER</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(4,-4)">
                <textPath xlinkHref={`#${pathLine3}`}>DIRECTOR</textPath>
              </text>
            </g>
          </g>

          {/* Group: Main Clapperboard (Non-Reflected) */}
          <g transform="translate(9.2397 5.5438)">
            
            {/* Body elements (Main) */}
            <path
              d="m392.46 55.418l-22.39 12.04-323.06 73.452"
              fillRule="evenodd"
              stroke={mainColor}
              strokeWidth=".75px"
              fill={`url(#${lgBodyT})`}
            />
            <g fill={mainColor} stroke={mainColor} strokeWidth=".75px" fillRule="evenodd">
                <path d="m47.778 141.76l85.222 342.17 345.57-163.97-77.73-234.17-353.06 55.97z" />
                <path d="m47.616 141.61l-11.307 5.88 84.941 336.83 12.63-0.45" />
                <path d="m46.426 140.83l345.4-85.597-9.93-25.516-348.12 74.173 12.646 36.94z" />
                <path d="m33.661 103.95l-10.426 7.17 12.308 35.25 10.877-5.65-12.759-36.77z" />
            </g>

            {/* White lines and stripes (Main) - These define the IDs used by textPath */}
            <g fill={highlightColor} stroke={highlightColor} fillRule="evenodd">
                <path id={pathLine1} d="m68.86 224.26l349.73-84.05 0.12-0.9" strokeWidth="1.125" />
                <path id={pathLine2} d="m80.808 273.54l350.48-97.06 0.16-0.33" strokeWidth="1.125" />
                <path id={pathLine3} d="m96.672 336.4l350.48-115.52-0.06-1.03" strokeWidth="1.2689" />
                <path d="m224.98 294.44l36.24 128.58-0.04-0.81" strokeWidth="1.5" fill="none" />
                <path d="m348.38 253.39l32.27 112.79 0.2-0.83 0.26 0.23" strokeWidth="1.5" fill="none" />
            </g>

            {/* Stripes on bars (Main) */}
            <g fill={highlightColor} fillRule="evenodd">
                <g transform="matrix(.74910 -.036820 .036820 .74910 -43.559 -88.053)">
                    <path d="m89.414 260.45l72.266 38.77 35.84-6.87-71.2-37.96-36.906 6.06z" />
                    <path d="m166.19 247.83l70.36 36.29 38.69-7.17-72.07-34.97-36.98 5.85z" />
                    <path d="m245.78 234.8l71.5 34.08 37.47-6.87-74.47-32.86-34.5 5.65z" />
                    <path d="m322.94 222.35l71.34 31.43 39.96-6.86-76.25-29.8-35.05 5.23z" />
                    <path d="m407.16 209.29l65.52 29.36 34.44-6.36-67.36-28.84-32.6 5.84z" />
                    <path d="m480.64 197.1l59.63 28.59 30.2-5.55-60.28-28.07-29.55 5.03z" />
                </g>
                <path d="m58.025 180.03l34.23-45.59 24.215-3.55-33.205 43.8-25.24 5.34z" />
                <path d="m111.49 168.44l35.45-42.19 26.53-4.15-37.24 41.84-24.74 4.5z" />
                <path d="m166.95 156.3l44.01-40.87 28.52-4.73-43.3 39.67-29.23 5.93z" />
                <path d="m224.98 143.83l42.93-37.66 29.9-5.14-44.63 37.07-28.2 5.73z" />
                <path d="m291.71 130.06l38.35-33.575 25.86-4.286-39.77 33.691-24.44 4.17z" />
                <path d="m339.09 120.51l38.73-31.51 22.61-3.743-35.27 30.233-26.07 5.02z" />
            </g>

            {/* Edge highlights (Main) */}
            <g stroke={mainColor} strokeWidth=".75px" fillRule="evenodd">
                <path fill={`url(#${lgHighlightT1})`} d="m47.616 141.61l-11.307 5.88 84.941 336.83 12.63-0.45" />
                <path fill={`url(#${lgHighlightT2})`} d="m33.661 103.95l-10.426 7.17 12.308 35.25 10.877-5.65-12.759-36.77z" />
            </g>

            {/* Text Elements (Main) */}
            <g fill={highlightColor} fontSize="12px" fontFamily="Arial Black, Impact, sans-serif" textAnchor="start">
               <text xmlSpace="preserve" transform="translate(41.893 6.375)">
                <textPath xlinkHref={`#${pathLine3}`}>SCENE</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(176.68 -38.25)">
                <textPath xlinkHref={`#${pathLine3}`}>TAKE</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(295.07 -78.321)">
                <textPath xlinkHref={`#${pathLine3}`}>ROLL</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(4,-4)">
                <textPath xlinkHref={`#${pathLine1}`}>TITLE</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(4,-4)">
                <textPath xlinkHref={`#${pathLine2}`}>PRODUCER</textPath>
              </text>
              <text xmlSpace="preserve" transform="translate(4,-4)">
                <textPath xlinkHref={`#${pathLine3}`}>DIRECTOR</textPath>
              </text>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};

export default ClapperIcon;

