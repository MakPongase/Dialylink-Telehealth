-- Enable INSERT for patients bucket
CREATE POLICY "Allow public uploads to patients bucket" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'patients');

-- Enable SELECT for patients bucket
CREATE POLICY "Allow public reads from patients bucket" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'patients');

-- Enable DELETE for patients bucket
CREATE POLICY "Allow public deletes from patients bucket" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'patients');
