package test
import java.io._

class userCreditCard(val xc: String, val yc: String) {

    var creditCard: String = xc

    var cvv: String = yc

    def add(x: Int, y: Int): Int = x + y
    def move(dx: Int, dy: Int) = {
        var str = ""123.4""
        var d = str toDouble;
        if(d > 10)  println(""Larger than 10"")
        x = x + dx
        y = y + dy
        println(x)
    }
}