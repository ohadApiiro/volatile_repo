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

    PatientContact(PatientId, PatientLastName, Employer, company, gender)
    {
        PatientId = PatientId;
        PatientLastName = PatientLastName;
        Employer = Employer;
        company = company;
        gender = gender
    }
}
