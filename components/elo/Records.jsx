"use client";

export default function Records({ records }) {
  if (records.length === 0) return null;
  return (
    <div className="elo-tablewrap">
      <table className="elo-data elo-records">
        <thead>
          <tr>
            <th>record</th>
            <th className="elo-left">holder</th>
            <th>mark</th>
            <th className="elo-left">context</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td className="elo-left">{r.holder}</td>
              <td>{r.value}</td>
              <td className="elo-left elo-dim">
                {r.detail}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
