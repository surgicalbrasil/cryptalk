#!/usr/bin/expect -f

set timeout 30

spawn w3 space create cryptalk-storage --no-recovery

# Primeira pergunta sobre billing
expect "How do you want to authorize your account?"
send "\r"

# Pergunta sobre email
expect "Please enter an email address"
send "\r"

# Segunda pergunta sobre autorização
expect "How do you want to authorize your account?"
send "\033\[B\r"

expect eof