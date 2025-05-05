-- Create the feedback_messages table
CREATE TABLE feedback_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT,
  review INTEGER NOT NULL CHECK (review BETWEEN 1 AND 5),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE feedback_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting feedback - allow any authenticated user to insert feedback
CREATE POLICY "Allow authenticated users to insert feedback" ON feedback_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for viewing feedback - allow users to see their own feedback
CREATE POLICY "Allow users to view their own feedback" ON feedback_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policy for admin to read all feedback
CREATE POLICY "Allow admins to read all feedback" ON feedback_messages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )); 