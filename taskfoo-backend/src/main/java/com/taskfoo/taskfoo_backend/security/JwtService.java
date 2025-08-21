package com.taskfoo.taskfoo_backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    private final Key key;
    private final long accessExpMillis;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-exp-min}") long accessExpMinutes
    ) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(secret.getBytes())
        ));
        this.accessExpMillis = accessExpMinutes * 60 * 1000;
    }

    public String generate(String subject, Map<String,Object> claims) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(subject)
                .addClaims(claims)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + accessExpMillis))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractSubject(String token) {
        return parseAll(token).getBody().getSubject();
    }

    public boolean isValid(String token) {
        try { parseAll(token); return true; }
        catch (JwtException | IllegalArgumentException e) { return false; }
    }

    private Jws<Claims> parseAll(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
    }
}