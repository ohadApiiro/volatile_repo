from django.db import models

# Create your models here.

class Account(models.Model):
    title    = models.CharField(max_length=50)
    balance  = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)
    #content = models.TextField()
    #created_at = models.DateTimeField(auto_now_add=True)
    #updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title