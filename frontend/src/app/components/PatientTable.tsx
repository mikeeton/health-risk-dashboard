import type { Patient } from "../../types/patient";

type PatientTableProps = {
  patients: Patient[];
};

function PatientTable({ patients }: PatientTableProps) {
  return (
    <section className="table-section">
      <h2>Patient Records</h2>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>Condition</th>
            <th>Risk Level</th>
            <th>Last Checkup</th>
          </tr>
        </thead>

        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td>{patient.name}</td>
              <td>{patient.age}</td>
              <td>{patient.condition}</td>
              <td>{patient.riskLevel}</td>
              <td>{patient.lastCheckup}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default PatientTable;
