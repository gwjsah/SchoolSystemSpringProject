USE `school_management`;
-- completed_subjects for Sofia Garcia (BSIT, year 3) - all BSIT Year 1-2 subjects
-- Grade assumption: 1.0-5.0 scale, higher = better, passing >= 3.0
START TRANSACTION;
INSERT INTO completed_subjects (id, grade, school_year, semester, student_id, subject_id) VALUES
-- 2023-2024 FIRST
('f56f64d4-e10b-4d17-932b-b5863180881f', 4.5, '2023-2024', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '119937ec-4cb2-41da-8231-7249a4bd2b48'), -- CSIT111
('6a3bd629-18d3-45b3-b93f-d3f1f49304e1', 4.0, '2023-2024', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'eeff7c7d-e8fb-44b4-83dd-3f2802dc2f22'), -- CSIT121
('3caca74d-e1d1-4e51-b89c-4daed3dda3b4', 3.0, '2023-2024', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '20f6b895-7675-4f41-9f40-6bfb50c0fbff'), -- ENGL031
('ba09a177-b82c-4be2-b8a2-da8d04ca9f15', 3.5, '2023-2024', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'e2262eab-9c54-45b4-9374-e846543d6f1a'), -- MATH031
('21013820-999a-41fd-bffb-2a12fd31b5cc', 3.5, '2023-2024', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'e8384211-f41d-43d3-a94c-3738a80dd611'), -- PHILO031
('2731722e-ba48-4210-bd4a-0a6873aaf599', 4.0, '2023-2024', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '9e898264-c446-4d73-a673-7de974d87e04'), -- PE101
('396a4e7c-ad59-4316-ac37-ecdf23a38e9f', 3.0, '2023-2024', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'a77d25ac-277f-4940-8d45-1cbe68546654'), -- NSTP101
-- 2023-2024 SECOND
('bee98bde-9bca-4a9e-a360-8ad495f45ef4', 3.5, '2023-2024', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'defe6153-1003-475c-8cf3-5e33e0ee6e5d'), -- CSIT122
('ac386dfa-c18b-4e41-aad5-38d8659b2594', 4.0, '2023-2024', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '31a28a7c-a24f-45cf-bf1f-6537530bebfe'), -- CSIT123
('cd376561-7854-4084-b723-8b1bba1f410a', 4.0, '2023-2024', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '2fce4c79-06da-4964-907c-4ad8cb7208c7'), -- HIST031
('fadc4dbc-7541-4fb8-ae63-ea0d79a89315', 4.5, '2023-2024', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '1bbc2e3b-c5b9-422b-ac5e-51f21db9437c'), -- STS121
('caf5017a-bb7c-46be-abc0-50103e7c3291', 4.5, '2023-2024', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '8790c7c4-47f9-4853-b6c5-dd44804c8383'), -- PE102
('b00ab72f-25ef-4848-96d6-c24f02a6a334', 4.0, '2023-2024', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '929235c8-2944-4728-8bff-3009cdf7b73a'), -- NSTP102
-- 2024-2025 FIRST
('9a29508e-1a3b-4141-bc41-667ad190e9d3', 4.5, '2024-2025', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'f330ae80-2fef-4ac9-a21f-91393fbe1b23'), -- CSIT221
('ab3b47ac-72ad-4722-bc71-06e1a4c800cb', 3.0, '2024-2025', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '2a13f2b8-f8da-4dd1-8a44-c52a297d6899'), -- CSIT227
('7394d3b6-8b97-48ae-bc9c-f06b78c02143', 3.5, '2024-2025', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'c2f7eb91-5927-4ad0-b7d4-48cd2031582e'), -- IT211
('6d2063da-067b-4dc5-8756-38acff1e005e', 3.5, '2024-2025', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '4e0f299d-8177-46d8-9180-f87eeeb463ff'), -- IT212
('5fdb8e2c-3439-4711-abb6-8029f43c41ae', 3.0, '2024-2025', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '63e10ad9-7f1f-40de-b58e-509ece4ba1bd'), -- STAT211
('d76266db-d344-430f-a920-5facdc148272', 4.0, '2024-2025', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'f53b4b6b-9921-4c6d-a2d5-0ed547b52afe'), -- MATH032
('7aa974e3-ff5a-4def-b356-936109f0c22d', 4.0, '2024-2025', 'FIRST', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '77c0e441-cbc9-4177-bba4-5b539a65fac8'), -- PE201
-- 2024-2025 SECOND
('37a4105a-0a05-4b6c-b972-93624bec41b9', 3.5, '2024-2025', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'd5a831a7-c3d0-475a-b123-1f33367b6b5d'), -- CSIT226
('75f882e4-d529-4875-802a-8e8a27b756c9', 4.0, '2024-2025', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'ad49825f-e9de-4539-b4fd-80b68d031b27'), -- CSIT228
('67434630-5c45-4fc8-8d50-e9dccdb3bd69', 3.5, '2024-2025', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '0a6afedf-44d8-4566-905e-1cd12df09946'), -- IT221
('b0e0e79a-16b1-426a-a4d3-e0fdda1d50c5', 3.5, '2024-2025', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '56c12306-f542-4291-9583-fa0837f9b67a'), -- IT222
('3110a48e-d9b6-4d79-b2c9-2270b6a054c7', 3.0, '2024-2025', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', '4c86abee-2c99-4aca-9f52-d5237971998c'), -- IT223
('bc079ade-8949-49b4-9160-db92c2697a0b', 4.5, '2024-2025', 'SECOND', 'f246fbdb-557b-4736-ad57-bb772a5651c4', 'd8c9c3ae-ae2e-44f8-a98d-e5f541da16e0');  -- PE202
COMMIT;

-- Verify: expect 26 rows
SELECT COUNT(*) FROM completed_subjects WHERE student_id = 'f246fbdb-557b-4736-ad57-bb772a5651c4';
SELECT sub.subject_code, cs.school_year, cs.semester, cs.grade
FROM completed_subjects cs JOIN subjects sub ON sub.id = cs.subject_id
WHERE cs.student_id = 'f246fbdb-557b-4736-ad57-bb772a5651c4' ORDER BY cs.school_year, cs.semester, sub.subject_code;