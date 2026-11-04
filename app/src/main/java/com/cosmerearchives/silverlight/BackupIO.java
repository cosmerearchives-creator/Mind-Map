package com.cosmerearchives.silverlight;
import java.io.*;
import java.security.MessageDigest;
final class BackupIO {
    static String digest(InputStream source) throws Exception {return digest(source,n->{},()->false);}
    static String digest(InputStream source,java.util.function.LongConsumer progress,java.util.function.BooleanSupplier cancelled) throws Exception { if(source==null)throw new IOException("Backup cannot be read back.");MessageDigest sha=MessageDigest.getInstance("SHA-256");try(InputStream in=source){byte[] block=new byte[65536];int n;long total=0;progress.accept(0);while((n=in.read(block))!=-1){if(cancelled.getAsBoolean())throw new IOException("Backup cancelled.");sha.update(block,0,n);total+=n;progress.accept(total);}}StringBuilder hex=new StringBuilder();for(byte b:sha.digest())hex.append(String.format("%02x",b & 255));return hex.toString(); }
}
