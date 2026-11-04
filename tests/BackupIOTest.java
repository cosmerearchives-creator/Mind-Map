package com.cosmerearchives.silverlight;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
public final class BackupIOTest {
 public static void main(String[] args)throws Exception{File file=File.createTempFile("arcanum-memory-",".partial");try{byte[] block=new byte[65536];new java.util.Random(123).nextBytes(block);MessageDigest hash=MessageDigest.getInstance("SHA-256");try(OutputStream out=new FileOutputStream(file)){for(int i=0;i<8192;i++){out.write(block);hash.update(block);}}StringBuilder expected=new StringBuilder();for(byte b:hash.digest())expected.append(String.format("%02x",b & 255));if(!expected.toString().equals(BackupIO.digest(new FileInputStream(file))))throw new AssertionError("Read-back mismatch");if(Runtime.getRuntime().maxMemory()>40L*1024*1024)throw new AssertionError("Run with the bounded heap");boolean[] cancelled={false};try{BackupIO.digest(new FileInputStream(file),n->{if(n>65536)cancelled[0]=true;},()->cancelled[0]);throw new AssertionError("Cancellation ignored");}catch(IOException expectedCancel){if(!expectedCancel.getMessage().contains("cancelled"))throw expectedCancel;}System.out.println("PASS: Android backup read-back code verifies 512 MiB on a 32 MiB JVM heap with fixed 64 KiB I/O buffers (not a physical WebView memory measurement).");}finally{Files.deleteIfExists(file.toPath());}}
}
