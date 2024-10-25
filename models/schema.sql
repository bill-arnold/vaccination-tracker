CREATE TABLE individuals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    vaccine_type VARCHAR(100),
    vaccination_date DATE,
    status VARCHAR(20) CHECK (status IN ('Completed', 'Pending'))
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);
