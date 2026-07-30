"use client";

export default function Records({ records }) {
  if (records.length === 0) return null;
  return (
    <div className="elo-tablewrap">
      <table className="elo-data">
        <thead>
          <tr>
            <th>record</th>
            <th style={{ textAlign: "left" }}>holder</th>
            <th>mark</th>
            <th style={{ textAlign: "left" }}>context</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td style={{ textAlign: "left" }}>{r.holder}</td>
              <td>{r.value}</td>
              <td style={{ textAlign: "left" }} className="elo-dim">
                {r.detail}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
