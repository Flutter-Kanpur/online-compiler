import React, { useState } from "react";

const regionNames = (() => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; }
})();

export function countryName(code) {
  try { return regionNames?.of(code) || code; } catch { return code; }
}

export function Flag({ code, height = 14 }) {
  const [broken, setBroken] = useState(false);
  if (!code || broken) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      title={countryName(code)}
      onError={() => setBroken(true)}
      className="rounded-sm flex-shrink-0 object-cover"
      style={{ height, width: height * 1.4, boxShadow: "0 0 0 1px rgba(0,0,0,0.1)" }}
    />
  );
}
