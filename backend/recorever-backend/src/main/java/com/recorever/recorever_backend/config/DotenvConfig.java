package com.recorever.recorever_backend.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.lang.NonNull;

import java.util.HashMap;
import java.util.Map;

/**
 * Loads .env variables into Spring before the app fully starts.
 */
public class DotenvConfig implements 
        ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(
            @NonNull ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment environment = applicationContext.getEnvironment();

        try {
            // Load the .env file (ignores if missing)
            Dotenv dotenv = Dotenv.configure()
                    .ignoreIfMissing()
                    .load();

            // Copy .env pairs to a Map
            Map<String, Object> dotenvProperties = new HashMap<>();
            dotenv.entries().forEach(entry -> 
                    dotenvProperties.put(entry.getKey(), entry.getValue()));

            // Give .env variables the highest priority
            environment.getPropertySources().addFirst(
                    new MapPropertySource("dotenvProperties", 
                            dotenvProperties));

        } catch (Exception e) {
            // Just print a warning if .env fails to load
            System.err.println("Warning: Could not load .env file: " + 
                    e.getMessage());
        }
    }
}