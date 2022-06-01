using System;

namespace PatientContact;

[Serializable]
public class PatientContact()
{
    [Key]
    string telephone_number;
    string other_telephone_number;
    string fax;
    string email;
    string gender;

    PatientContact(telephone_number, other_telephone_number, fax, email, gender)
    {
        telephone_number = telephone_number;
        other_telephone_number = other_telephone_number;
        fax = fax;
        email = email;
        gender = gender
    }
}
