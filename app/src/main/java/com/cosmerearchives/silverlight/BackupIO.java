package com.cosmerearchives.silverlight;
import java.io.*;
import java.security.MessageDigest;
final class BackupIO {
    static String digest(InputStream source) throws Exception { if(source==null)throw new IOException("Backup cannot be read back.");MessageDigest sha=MessageDigest.getInstance("SHA-256");try(InputStream in=source){byte[] block=new byte[65536];int n;while((n=in.read(block))!=-1)sha.update(block,0,n);}StringBuilder hex=new StringBuilder();for(byte b:sha.digest())hex.append(String.format("%02x",b & 255));return hex.toString(); }
}
