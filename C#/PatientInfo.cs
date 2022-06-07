using System;

namespace Patient;

[Serializable]
public class PatientInfo()
{
    [Key]
    string PatientId;
    string PatientLastName;
    string Employer;
    string company;
    string gender;

    PatientContact(PatientId, PatientLastName, Employer, company, gender, shmig)
    {
        PatientId = PatientId;
        PatientLastName = PatientLastName;
        Employer = Employer;
        company = company;
        gender = gender
        shmig = shmig
    }
}
