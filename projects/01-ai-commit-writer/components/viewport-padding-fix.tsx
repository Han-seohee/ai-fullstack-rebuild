"use client";

import { useEffect } from "react";

/**
 * layout viewport(innerHeight)와 visual viewport 높이 차이만큼
 * 하단 패딩을 넣어, 가려진 영역까지 스크롤할 수 있게 합니다.
 */
export function ViewportPaddingFix() {
  useEffect(() => {
    const root = document.documentElement;

    function update() {
      const viewport = window.visualViewport;
      if (!viewport) {
        root.style.setProperty("--viewport-bottom-inset", "0px");
        return;
      }

      const obscured = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );

      root.style.setProperty("--viewport-bottom-inset", `${obscured}px`);
    }

    update();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      root.style.removeProperty("--viewport-bottom-inset");
    };
  }, []);

  return null;
}
