-- Demo users (replace password_hash values later with bcrypt hashes)
INSERT INTO app_user(email, password_hash, full_name, role) VALUES
 ('admin@example.com',     '$2b$11$placeholderadminhash', 'Admin User', 'ADMIN'),
 ('instructor@example.com','$2b$11$placeholderinschash', 'Instructor User', 'INSTRUCTOR'),
 ('s1@example.com',        '$2b$11$placeholderstud1hash', 'Student One', 'STUDENT'),
 ('s2@example.com',        '$2b$11$placeholderstud2hash', 'Student Two', 'STUDENT');

-- Create one sample class owned by instructor
INSERT INTO class(title, term, instructor_id)
VALUES ('CSCI 1010', 'Fall 2025',
       (SELECT id FROM app_user WHERE email='instructor@example.com'));

-- Enroll students into that class
INSERT INTO enrollment(class_id, student_id)
SELECT c.id, u.id
FROM class c
JOIN app_user u ON u.email IN ('s1@example.com','s2@example.com')
WHERE c.title='CSCI 1010' AND c.term='Fall 2025';

-- Optional: create a sample chat thread between instructor and Student One
WITH ins AS (
  SELECT id AS instructor_id FROM app_user WHERE email='instructor@example.com'
), s AS (
  SELECT id AS student_id FROM app_user WHERE email='s1@example.com'
), t AS (
  INSERT INTO message_thread(kind, title, created_by)
  SELECT 'DIRECT', 'Instructor ↔ Student One', instructor_id FROM ins
  RETURNING id
)
INSERT INTO message_thread_participant(thread_id, user_id)
SELECT t.id, x.uid
FROM t
JOIN (
  SELECT instructor_id AS uid FROM ins
  UNION ALL
  SELECT student_id      AS uid FROM s
) x ON true;

INSERT INTO message(thread_id, sender_id, body)
SELECT mt.id, au.id, 'Welcome to the class!'
FROM message_thread mt, app_user au
WHERE mt.title='Instructor ↔ Student One' AND au.email='instructor@example.com';

INSERT INTO message(thread_id, sender_id, body)
SELECT mt.id, au.id, 'Thank you!'
FROM message_thread mt, app_user au
WHERE mt.title='Instructor ↔ Student One' AND au.email='s1@example.com';
