import { useEffect } from 'react';

export const useSpline = (containerSelector) => {
  useEffect(() => {
    const splineEmbed = document.querySelector(containerSelector);
    if (!splineEmbed) return;

    const splineCanvas = splineEmbed.querySelector("canvas");
    const splineURL = splineEmbed.getAttribute("data-spline-url");

    if (!splineURL || !splineCanvas) return;

    const splineScript = document.createElement("script");
    splineScript.src = splineURL;
    splineScript.async = true;

    splineScript.onload = () => {
      setTimeout(() => {
        splineCanvas.style.opacity = "1";
      }, 750);
    };

    splineScript.onerror = () => {
      console.error("Failed to load Spline scene.");
      splineCanvas.style.opacity = "1";
    };

    document.head.appendChild(splineScript);

    return () => {
      if (splineScript.parentNode) {
        splineScript.parentNode.removeChild(splineScript);
      }
    };
  }, [containerSelector]);
};
