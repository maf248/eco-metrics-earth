import type React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

/**
 * Generic error glyph for the error page: the same browser window as `NotFoundIcon`, with a
 * warning sign cut out of it instead of "404". The warning sign comes from SVG Repo
 * (https://www.svgrepo.com/svg/125291/warning-sign, SVG Repo License: commercial use allowed,
 * no attribution required), scaled into the window body.
 */
export default function ErrorIcon({ title, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      {...(title ? { 'aria-labelledby': 'error-icon-title' } : { 'aria-hidden': 'true' })}
      {...props}
    >
      {title && <title id="error-icon-title">{title}</title>}
      <g>
        <path
          fillRule="evenodd"
          d="M0,0v12v2v46h60V14v-2V0H0z M2,12V2h56v10H2z M44.377,43.001L34.367,25.654c-0.902,-1.562 -2.569,-2.524 -4.373,-2.524c-1.804,0 -3.47,0.963 -4.372,2.524L15.437,43.298c-0.902,1.562 -0.902,3.487 0,5.049C16.338,49.909 18.005,50.871 19.809,50.871H40.181c0.006,0 0.011,0 0.011,0c2.788,0 5.049,-2.261 5.049,-5.049C45.241,44.778 44.922,43.804 44.377,43.001z M32.157,44.689c0,1.194 -0.918,2.107 -2.156,2.107s-2.156,-0.913 -2.156,-2.107V44.64c0,-1.188 0.918,-2.107 2.156,-2.107S32.157,43.447 32.157,44.64V44.689z M32.206,30.489L31.139,39.806c-0.072,0.671 -0.517,1.089 -1.139,1.089s-1.067,-0.423 -1.139,-1.089L27.795,30.483c-0.072,-0.721 0.319,-1.265 0.99,-1.265H31.211C31.882,29.224 32.278,29.768 32.206,30.489z"
        />
        <polygon points="54.293,3.293 52,5.586 49.707,3.293 48.293,4.707 50.586,7 48.293,9.293 49.707,10.707 52,8.414 54.293,10.707 55.707,9.293 53.414,7 55.707,4.707" />
        <rect x="3" y="3" width="39" height="8" />
      </g>
    </svg>
  );
}
