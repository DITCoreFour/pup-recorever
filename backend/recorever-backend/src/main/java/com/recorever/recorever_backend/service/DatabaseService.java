package com.recorever.recorever_backend.service;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class DatabaseService {

    @Value("${spring.datasource.username}")
    private String dbUser;

    @Value("${spring.datasource.password}")
    private String dbPass;

    @Value("${spring.datasource.url}")
    private String dbUrl;

    private String getDatabaseName() {
        String path = dbUrl.substring(dbUrl.lastIndexOf("/") + 1);
        return path.split("[?;]")[0];
    }

    public byte[] generateBackup() throws Exception {
        String dbName = getDatabaseName();
        
        List<String> command = new ArrayList<>();
        command.add("mysqldump");
        command.add("-u" + dbUser);
        if (dbPass != null && !dbPass.isEmpty()) {
            command.add("-p" + dbPass);
        }

        command.add("--add-drop-table");
        command.add("--routines");
        command.add("--triggers");
        command.add(dbName);

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true); 
        
        Process process = pb.start();
        
        try (InputStream is = process.getInputStream()) {
            byte[] backupData = is.readAllBytes(); 
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("Backup failed: " + new String(backupData));
            }
            return backupData;
        }
    }

    public void restoreBackup(InputStream inputStream) throws Exception {
        String dbName = getDatabaseName();

        List<String> command = new ArrayList<>();
        command.add("mysql");
        command.add("-u" + dbUser);

        if (dbPass != null && !dbPass.isEmpty()) {
            command.add("-p" + dbPass);
        }
        command.add(dbName);

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true); 

        Process process = pb.start();

        try (OutputStream os = process.getOutputStream()) {
            inputStream.transferTo(os);
            os.flush();
        } catch (java.io.IOException e) {
            String errorMsg = new String(process.getInputStream().readAllBytes());
            throw new RuntimeException("MySQL connection failed: " + errorMsg);
        }
        
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            String errorMsg = new String(process.getInputStream().readAllBytes());
            throw new RuntimeException("Restore failed (Code " + exitCode + "): " + errorMsg);
        }
    }
}
