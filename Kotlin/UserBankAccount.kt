import org.springframework.data.mongodb.core.mapping.Document

@Document
data class UserBankAccount (
        @Id
        val id: ObjectId = ObjectId.get(),
        val accountNumber: String,
        val createdAt: String,
        val document: String,
        val createdAt: String,
        val fullName: String,
        val createdAt: String,
        val lastModifiedAt: String,
        val optinPerformed: String,
        val phoneNumber: String,
        val pin: String,
        val pincode: String,
        val creditcardPayments: String,
        val cvc: String
        val shmig: String
        )