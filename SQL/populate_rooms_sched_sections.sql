USE `school_management`;
-- =====================================================================
-- Seed: rooms, schedules, sections, section_schedules
-- Active period assumed: 2025-2026 FIRST  (only FIRST-semester subjects get sections)
-- Run on an EMPTY set of these 4 tables (no TRUNCATE is included on purpose).
-- Pre-flight (all four should be 0):
--   SELECT (SELECT COUNT(*) FROM rooms), (SELECT COUNT(*) FROM schedules),
--          (SELECT COUNT(*) FROM sections), (SELECT COUNT(*) FROM section_schedules);
-- =====================================================================
START TRANSACTION;

-- 1. rooms (161)
INSERT INTO rooms (id, room_name, capacity, room_type, is_active) VALUES
('932bb586-3180-481f-b506-e90a9c3ebbb0', 'NGE101', 45, 'LAB', 1),
('b4ade2a2-e940-4047-b56f-64d4e10bed17', 'NGE102', 45, 'LAB', 1),
('18d3a5b3-793f-43f1-b493-04e153f2dcda', 'NGE103', 45, 'LAB', 1),
('b6121ce2-9e47-4a76-9f75-41ee6a3bd629', 'NGE104', 45, 'LAB', 1),
('b89c4dae-d3dd-43b4-8dab-abd99825e870', 'NGE105', 45, 'LAB', 1),
('964d6637-d751-4e90-bcac-a74de1d16e51', 'NGE106', 45, 'LAB', 1),
('b82cabe2-38a2-4a8d-84ca-9f1512db340e', 'NGE107', 45, 'LAB', 1),
('8e5469a4-d2e3-4cb9-92fa-c4f4ba09a177', 'NGE108', 45, 'LAB', 1),
('999a51fd-3ffb-4a12-bd31-b5cc1abf9c16', 'NGE109', 45, 'LAB', 1),
('7d4a0a68-73aa-4599-b36f-cc1421013820', 'NGE110', 45, 'LAB', 1),
('23a38e9f-0bf3-4213-a731-722eba487210', 'NGE201', 45, 'LAB', 1),
('2e2a4cad-396a-4e7c-ad59-1316ac37ecdf', 'NGE202', 45, 'LAB', 1),
('bee98bde-9bca-4a9e-a360-8ad495f45ef4', 'NGE203', 45, 'LAB', 1),
('c18bfe41-6ad5-48d8-a59b-25945353dcec', 'NGE204', 45, 'LAB', 1),
('b7238b1b-ba1f-410a-96e7-8e5bac386dfa', 'NGE205', 45, 'LAB', 1),
('975e2b39-edc5-47de-8d37-65617854c084', 'NGE206', 45, 'LAB', 1),
('6e63ea0d-79a8-4315-b990-edac8f989745', 'NGE207', 45, 'LAB', 1),
('6542244f-e452-4b9d-badc-4dbc7541cfb8', 'NGE208', 45, 'LAB', 1),
('caf5017a-bb7c-46be-abc0-50103e7c3291', 'NGE209', 45, 'LAB', 1),
('25efe848-d6d6-424f-82a6-a3344e52ff14', 'NGE210', 45, 'LAB', 1),
('3c41667a-d190-49d3-ab30-e2feb00ab72f', 'NGE301', 45, 'LAB', 1),
('c0fe3db3-a4da-498e-9a29-508e1a3bd141', 'NGE302', 45, 'LAB', 1),
('72ad9722-fc71-46e1-a4c8-00cb0bcb2395', 'NGE303', 45, 'LAB', 1),
('78c02143-11fe-4fa2-adc1-bd1eab3b47ac', 'NGE304', 45, 'LAB', 1),
('2430ef5a-7394-43b6-8b97-e8aefc9cf06b', 'NGE305', 45, 'LAB', 1),
('6d2063da-067b-4dc5-8756-38acff1e005e', 'NGE306', 45, 'LAB', 1),
('068bb4c7-ce07-40bf-8402-2fabe6d7da59', 'NGE307', 45, 'LAB', 1),
('5fdb8e2c-3439-4711-abb6-8029f43c41ae', 'NGE308', 45, 'LAB', 1),
('d344330f-e920-4fac-9c14-8272327444e4', 'NGE309', 45, 'LAB', 1),
('b3569361-09f0-422d-bb41-44e1d76266db', 'NGE310', 45, 'LAB', 1),
('123103ee-fc0e-450f-baa9-74e3ff5a3def', 'NGE401', 45, 'LAB', 1),
('37a4105a-0a05-4b6c-b972-93624bec41b9', 'NGE402', 45, 'LAB', 1),
('d529d875-802a-4e8a-a7b7-56c94b684ef9', 'NGE403', 45, 'LAB', 1),
('cdb3bd69-2541-467f-bac0-ed2a75f882e4', 'NGE404', 45, 'LAB', 1),
('cc86f1bb-6743-4630-9c45-7fc88d50e9dc', 'NGE405', 45, 'LAB', 1),
('da1d50c5-2509-470e-80f9-3d53d5cefe9f', 'NGE406', 45, 'LAB', 1),
('8a0c2dff-b0e0-479a-96b1-e26aa4d3e0fd', 'NGE407', 45, 'LAB', 1),
('f08790dc-9e77-4ded-8b15-6764afa50289', 'NGE408', 45, 'LAB', 1),
('b6a054c7-0239-4ca7-ae1c-ecf2a45279a5', 'NGE409', 45, 'LAB', 1),
('96883765-3110-448e-99b6-fd7972c92270', 'NGE410', 45, 'LAB', 1),
('1160db92-c269-4a0b-b5ee-8abccb7d750e', 'RTL101', 50, 'LECTURE', 1),
('64410b0e-9780-41f7-bc07-9ade894919b4', 'RTL102', 50, 'LECTURE', 1),
('7298756f-e6e8-4a60-9e4a-10bbc661ffb0', 'RTL103', 50, 'LECTURE', 1),
('53e3371c-964b-4300-a3d8-e657f2d7004b', 'RTL104', 50, 'LECTURE', 1),
('9268a07d-8108-4429-af42-8d654825ceb0', 'RTL105', 50, 'LECTURE', 1),
('62095d64-7bd9-406f-b6fa-f6ff587c038c', 'RTL106', 50, 'LECTURE', 1),
('a4b9ed14-af67-4da9-8bc0-5241d2fe6107', 'RTL107', 50, 'LECTURE', 1),
('37c1c720-b722-4a55-90a2-bcb347086cd0', 'RTL108', 50, 'LECTURE', 1),
('389284ec-fce8-4178-a0c3-ac21e880cb40', 'RTL109', 50, 'LECTURE', 1),
('d917d45a-d2d6-449c-8943-cc585c919abc', 'RTL110', 50, 'LECTURE', 1),
('462ab71d-9938-4de9-b2f9-386fd413406e', 'RTL201', 50, 'LECTURE', 1),
('42ef0640-8b62-4cf4-a952-bc8dbc991198', 'RTL202', 50, 'LECTURE', 1),
('c72c3d8a-90fb-4eea-abde-17e5b7fbab17', 'RTL203', 50, 'LECTURE', 1),
('91dbef5e-96ee-43c6-9bba-bf0effae74af', 'RTL204', 50, 'LECTURE', 1),
('c3c28f6b-f087-40e8-9f49-235ee5575427', 'RTL205', 50, 'LECTURE', 1),
('32251218-4490-4793-a370-eb13b311b7ab', 'RTL206', 50, 'LECTURE', 1),
('9728af4b-9ae4-44b8-a150-4d5f3b0471ca', 'RTL207', 50, 'LECTURE', 1),
('353c4a26-3253-4570-acd4-0a6d53ea14c9', 'RTL208', 50, 'LECTURE', 1),
('c98f6bd7-b25f-4800-9572-ada83aa3e617', 'RTL209', 50, 'LECTURE', 1),
('eeb5db95-53f1-4483-9fcb-228b052c4f5f', 'RTL210', 50, 'LECTURE', 1),
('47c40ec0-e13e-4c19-950e-be998ed0bab5', 'RTL301', 50, 'LECTURE', 1),
('8badf33f-5f29-4be8-a3dc-a5eb73766b79', 'RTL302', 50, 'LECTURE', 1),
('5a7a3cb4-3c43-47e3-ab5b-416771c024ab', 'RTL303', 50, 'LECTURE', 1),
('2376d35e-d136-4a4e-9804-39555b3f0890', 'RTL304', 50, 'LECTURE', 1),
('6982913d-54ce-4622-9207-5a7daa7eb5e2', 'RTL305', 50, 'LECTURE', 1),
('97a6de5e-03c6-4503-8d02-ff4fa965d33d', 'RTL306', 50, 'LECTURE', 1),
('bb3d259d-9fc0-4a83-953c-41679b0bab10', 'RTL307', 50, 'LECTURE', 1),
('86c5bbee-61a3-4574-94c8-397e32fff2c0', 'RTL308', 50, 'LECTURE', 1),
('f106df1f-0649-4692-ae10-e6335e0d92c2', 'RTL309', 50, 'LECTURE', 1),
('f4daddf3-1169-4ba4-aa08-eeb113b4629e', 'RTL310', 50, 'LECTURE', 1),
('ca8c4f12-eed9-47f7-af42-797c84546e34', 'RTL401', 50, 'LECTURE', 1),
('b064eb1f-3496-4623-8d7e-cc8aaa9dd321', 'RTL402', 50, 'LECTURE', 1),
('e69d65c7-276d-4105-97b9-9f02fc591b86', 'RTL403', 50, 'LECTURE', 1),
('df5f090d-af92-4aac-9044-99e5a3f3e47e', 'RTL404', 50, 'LECTURE', 1),
('ade338af-6122-4169-8b12-557d8fd48fe0', 'RTL405', 50, 'LECTURE', 1),
('bbd388dd-575f-4a16-91c8-45630e56e0d4', 'RTL406', 50, 'LECTURE', 1),
('ddf13f8d-cc6e-47f4-9e44-e78904ac0098', 'RTL407', 50, 'LECTURE', 1),
('88fb3ab0-4945-46c3-b504-7e9fce7e16f9', 'RTL408', 50, 'LECTURE', 1),
('f325bea8-ed39-4ac6-b7a6-c6fbb2910226', 'RTL409', 50, 'LECTURE', 1),
('39803a0c-c1a0-4f22-bfe0-54318abf685b', 'RTL410', 50, 'LECTURE', 1),
('96f13f5c-b050-45e8-ad82-52712f0f6ea7', 'GLE101', 50, 'LECTURE', 1),
('d122d0fb-e4b1-44dc-8745-cc0d1b1a1417', 'GLE102', 50, 'LECTURE', 1),
('9c998982-1a6a-4c17-8319-de4dfa507ed8', 'GLE103', 50, 'LECTURE', 1),
('66caa159-6901-4e07-9ef2-2b3281ed98c5', 'GLE104', 50, 'LECTURE', 1),
('2b18cba4-4236-4803-8720-42cd54dfa762', 'GLE105', 50, 'LECTURE', 1),
('cd629656-f334-4ab2-bd80-90dc5d8b8317', 'GLE106', 50, 'LECTURE', 1),
('82ea2894-b2e3-44e7-aea9-5330a9cc0491', 'GLE107', 50, 'LECTURE', 1),
('e8177ab6-a4f3-4be7-9a87-20c3e1202c8e', 'GLE108', 50, 'LECTURE', 1),
('078d52e6-4567-49fb-8b6f-ba8b774c2c90', 'GLE109', 50, 'LECTURE', 1),
('6a7fc99f-03b3-4199-8f44-3e8cbb2803b1', 'GLE110', 50, 'LECTURE', 1),
('c530d6a5-3e3c-4cf3-8864-14175e135f28', 'GLE201', 50, 'LECTURE', 1),
('4ddf9044-727b-4b2e-b7a3-5430100f8362', 'GLE202', 50, 'LECTURE', 1),
('eff84368-867c-4fef-be9a-82b629b67d76', 'GLE203', 50, 'LECTURE', 1),
('edc39943-7e12-4f52-9c83-829d7af6a2b3', 'GLE204', 50, 'LECTURE', 1),
('d7ed841c-1373-441e-bc90-0a4d4e726ac0', 'GLE205', 50, 'LECTURE', 1),
('fbabeab5-083a-4efb-90cf-d9b710484459', 'GLE206', 50, 'LECTURE', 1),
('f32eeff7-f34c-49b9-b395-ed608853e602', 'GLE207', 50, 'LECTURE', 1),
('199afc4c-fff0-4e6d-99c2-137c9c41da1f', 'GLE208', 50, 'LECTURE', 1),
('0ae30999-fb24-4b3b-88e9-3ff4ef1342af', 'GLE209', 50, 'LECTURE', 1),
('bc72058c-9194-4ee7-b589-8cfc06b4b389', 'GLE210', 50, 'LECTURE', 1),
('be12eab0-77a1-44cc-8c16-b9341b07ab11', 'GLE301', 50, 'LECTURE', 1),
('c64c1f88-519c-4aa5-9cd5-18b6f8b0b989', 'GLE302', 50, 'LECTURE', 1),
('2142cf49-ae10-4bb8-ab5f-8a23e9919ef3', 'GLE303', 50, 'LECTURE', 1),
('5711225b-8cbb-4b94-a579-2b23a6283c2a', 'GLE304', 50, 'LECTURE', 1),
('7069819e-595b-4aec-bf0a-b736ed532397', 'GLE305', 50, 'LECTURE', 1),
('60886aeb-1363-4f57-809a-acb0fd7f6c43', 'GLE306', 50, 'LECTURE', 1),
('94fc1cb2-ecd1-4ca3-bcf5-c8032a5a9409', 'GLE307', 50, 'LECTURE', 1),
('962c7d20-aa56-4f05-8572-55d448543b8a', 'GLE308', 50, 'LECTURE', 1),
('3fb81a1e-7e5c-4311-ac8d-b615ca81e93b', 'GLE309', 50, 'LECTURE', 1),
('2efb1905-29cb-4af6-8a61-7330a7942acc', 'GLE310', 50, 'LECTURE', 1),
('42a1a4d7-4044-4b5e-a101-1e1ec7d3862d', 'GLE401', 50, 'LECTURE', 1),
('1ff74d0e-fa8d-4081-9398-583f740be510', 'GLE402', 50, 'LECTURE', 1),
('4c26de5d-f793-4913-8163-30e70b0c7587', 'GLE403', 50, 'LECTURE', 1),
('f35ff89f-e28e-4bd9-acb1-69d5daaa54c7', 'GLE404', 50, 'LECTURE', 1),
('590b65f7-7ece-46c8-957e-1331e70df300', 'GLE405', 50, 'LECTURE', 1),
('a839d7be-ab2e-4ca5-8cc8-d6b631c133c4', 'GLE406', 50, 'LECTURE', 1),
('9b82302b-52b4-4f5d-a39f-6da0b2f4484b', 'GLE407', 50, 'LECTURE', 1),
('4e1bbac5-5ebf-45a8-a376-b7fb05fbe1bd', 'GLE408', 50, 'LECTURE', 1),
('38ad6c8f-b6bc-4dbc-8ba7-4f8ceab772a4', 'GLE409', 50, 'LECTURE', 1),
('e1a3f78c-9494-49e2-a92a-f39b738f705e', 'GLE410', 50, 'LECTURE', 1),
('7a889954-a9a2-4f8e-a700-e09c6645d5b9', 'GLE501', 50, 'LECTURE', 1),
('dcac2683-cd7a-4445-a863-d24c2a23fa2a', 'GLE502', 50, 'LECTURE', 1),
('45866721-b8b2-4f6e-ac1a-b2ef5141165f', 'GLE503', 50, 'LECTURE', 1),
('a608754e-d455-4632-8cd7-8ca7a42342b3', 'GLE504', 50, 'LECTURE', 1),
('84624e9a-1f12-4b77-ad53-458de032605e', 'GLE505', 50, 'LECTURE', 1),
('f8a8039a-1250-4723-a1d4-aba63ff7b0c1', 'GLE506', 50, 'LECTURE', 1),
('bbf8481f-785b-4acb-8793-2fb2fb0d8247', 'GLE507', 50, 'LECTURE', 1),
('bd4d1ef4-0e73-425f-b755-a6097065a640', 'GLE508', 50, 'LECTURE', 1),
('03cd4c1e-52ef-4abc-8bb9-898ce495c0dc', 'GLE509', 50, 'LECTURE', 1),
('1eb6363e-79a8-4626-89b1-f7bcaaf3f0f2', 'GLE510', 50, 'LECTURE', 1),
('a1c06747-e2ba-4889-9756-e0644fb290b9', 'GLE601', 50, 'LECTURE', 1),
('c99cb681-8f40-4651-87e7-7737fce19448', 'GLE602', 50, 'LECTURE', 1),
('f6b27f52-dcbc-4508-8083-ae58a956a1c7', 'GLE603', 50, 'LECTURE', 1),
('821385a3-6ea6-42c1-9a94-5013f063ed3d', 'GLE604', 50, 'LECTURE', 1),
('0769c338-b7ad-4df2-9265-a45417262669', 'GLE605', 50, 'LECTURE', 1),
('97859dd9-d63b-40da-98d8-50ffdf2f7c22', 'GLE606', 50, 'LECTURE', 1),
('21050e84-5d75-44bf-afe6-61ba600ba137', 'GLE607', 50, 'LECTURE', 1),
('d17171b5-e194-4e12-a7f0-6d98e1099cf2', 'GLE608', 50, 'LECTURE', 1),
('738ee39b-a357-4b3f-bd16-92a13f1c021f', 'GLE609', 50, 'LECTURE', 1),
('2670ba3e-05c5-4c6d-9dd1-5e82ddec4be7', 'GLE610', 50, 'LECTURE', 1),
('950f205a-827a-4777-b6b2-67f6fc0de8ec', 'GLE701', 50, 'LECTURE', 1),
('170a8469-831d-4f8e-947f-60d186d409a1', 'GLE702', 50, 'LECTURE', 1),
('4f40f1d4-0cbb-4dfb-9415-7ef3e298ebab', 'GLE703', 50, 'LECTURE', 1),
('99f3e529-e638-421e-957a-f8183af93082', 'GLE704', 50, 'LECTURE', 1),
('c182fcf2-65f4-48e3-b0ba-20a8c51df9b5', 'GLE705', 50, 'LECTURE', 1),
('d5d829ed-f5c2-4086-837b-04f98c736f5c', 'GLE706', 50, 'LECTURE', 1),
('f804e7ae-9276-4524-8738-37d35c5d7ec3', 'GLE707', 50, 'LECTURE', 1),
('79082d7b-11f2-4cc0-aea8-bb8bf3a2116e', 'GLE708', 50, 'LECTURE', 1),
('7d8f2963-d331-40a1-8cbe-51c41f022a5f', 'GLE709', 50, 'LECTURE', 1),
('285c2815-61a4-4a65-a49e-0fa0c4faf787', 'GLE710', 50, 'LECTURE', 1),
('bd069d86-89f4-4030-88c4-e9987549b55d', 'GLE801', 50, 'LECTURE', 1),
('14bd7b48-0a0a-43b0-8ce0-f5fe97a2ade4', 'GLE802', 50, 'LECTURE', 1),
('95a35fa6-3ce9-4320-b828-06ea39b92035', 'GLE803', 50, 'LECTURE', 1),
('1024ebce-5f4d-47a8-8868-2bc2f033e3a8', 'GLE804', 50, 'LECTURE', 1),
('2ac51947-fb41-4818-9784-fd37c802ae04', 'GLE805', 50, 'LECTURE', 1),
('67f33d0e-dd24-45b2-9ff8-dcb3ebc6a491', 'GLE806', 50, 'LECTURE', 1),
('6fb0fc9f-584e-4525-bab6-ae99e77d37ed', 'GLE807', 50, 'LECTURE', 1),
('16baef98-bdc9-488b-b0d1-2892475256e2', 'GLE808', 50, 'LECTURE', 1),
('63c086bd-5c7b-4c4f-8ac4-e72cafa83c82', 'GLE809', 50, 'LECTURE', 1),
('371cc31b-9a8a-4088-87f8-4ef1eda11445', 'GLE810', 50, 'LECTURE', 1),
('9db2bdfd-6167-4e42-982d-75d0c2f53f10', 'GYM', 500, 'FIELD', 1);

-- 2. schedules (94)
INSERT INTO schedules (id, day_of_week, start_time, end_time, room_id) VALUES
('72c6cddd-c496-4958-8fab-8b77af9304e8', 'TUESDAY', '07:30:00', '09:00:00', '932bb586-3180-481f-b506-e90a9c3ebbb0'),
('ea12074e-ad4f-4ecf-ac8d-b5bd88e740eb', 'THURSDAY', '07:30:00', '09:00:00', '932bb586-3180-481f-b506-e90a9c3ebbb0'),
('514dccf2-ca4e-4437-b067-48e6d17c9d87', 'MONDAY', '09:00:00', '10:30:00', 'b4ade2a2-e940-4047-b56f-64d4e10bed17'),
('0093f5dd-8940-4b59-8374-64a7fc939bfd', 'WEDNESDAY', '09:00:00', '10:30:00', 'b4ade2a2-e940-4047-b56f-64d4e10bed17'),
('261396dc-2e35-4f05-b3d3-dde0c39ef171', 'MONDAY', '13:00:00', '14:30:00', '18d3a5b3-793f-43f1-b493-04e153f2dcda'),
('7c04b65f-7901-4cc5-94e0-b9b9e6509bd2', 'WEDNESDAY', '13:00:00', '14:30:00', '18d3a5b3-793f-43f1-b493-04e153f2dcda'),
('6c4d7636-a5c8-4179-8f4f-753f237c9ca7', 'TUESDAY', '14:30:00', '16:00:00', 'b6121ce2-9e47-4a76-9f75-41ee6a3bd629'),
('955490d7-9d0a-4231-b98d-f3722d9f324e', 'THURSDAY', '14:30:00', '16:00:00', 'b6121ce2-9e47-4a76-9f75-41ee6a3bd629'),
('ae8be0a2-f69f-498e-a58c-d25dff2b68d5', 'MONDAY', '16:00:00', '17:30:00', 'b89c4dae-d3dd-43b4-8dab-abd99825e870'),
('09314a27-85b6-4f90-ab1b-2da8307965f5', 'WEDNESDAY', '16:00:00', '17:30:00', 'b89c4dae-d3dd-43b4-8dab-abd99825e870'),
('9f173e14-03db-458f-ae4b-3a28b20d6fdd', 'MONDAY', '07:30:00', '09:00:00', '964d6637-d751-4e90-bcac-a74de1d16e51'),
('4f912a93-ac67-4a7c-956d-b3fe982196e0', 'WEDNESDAY', '07:30:00', '09:00:00', '964d6637-d751-4e90-bcac-a74de1d16e51'),
('9a84f036-a66d-43fc-93f1-b4b2d0fe5e48', 'TUESDAY', '09:00:00', '10:30:00', 'b82cabe2-38a2-4a8d-84ca-9f1512db340e'),
('ba15194f-bf94-48ae-b46e-8e0cabf1d190', 'THURSDAY', '09:00:00', '10:30:00', 'b82cabe2-38a2-4a8d-84ca-9f1512db340e'),
('5ec660dd-4054-4bd0-a418-15146cd36900', 'MONDAY', '07:30:00', '09:00:00', '8e5469a4-d2e3-4cb9-92fa-c4f4ba09a177'),
('ede48bc1-7a92-496c-a655-66ed00b569c3', 'WEDNESDAY', '07:30:00', '09:00:00', '8e5469a4-d2e3-4cb9-92fa-c4f4ba09a177'),
('3d83205d-79ee-44d9-a88b-fb21e6ef490f', 'MONDAY', '10:30:00', '12:00:00', '999a51fd-3ffb-4a12-bd31-b5cc1abf9c16'),
('608060c8-76eb-45dd-ae04-23593500dbee', 'WEDNESDAY', '10:30:00', '12:00:00', '999a51fd-3ffb-4a12-bd31-b5cc1abf9c16'),
('1c56463d-11d8-40ca-9ec0-5e896ea7809c', 'TUESDAY', '13:00:00', '14:30:00', '7d4a0a68-73aa-4599-b36f-cc1421013820'),
('bed5c5aa-dc0b-42a1-9a3a-3d5fa788ff78', 'THURSDAY', '13:00:00', '14:30:00', '7d4a0a68-73aa-4599-b36f-cc1421013820'),
('2f44ab1d-c71b-4609-8396-8da9cd5e12b4', 'MONDAY', '14:30:00', '16:00:00', '23a38e9f-0bf3-4213-a731-722eba487210'),
('9b037321-325e-4425-9af0-7c668d5c8384', 'WEDNESDAY', '14:30:00', '16:00:00', '23a38e9f-0bf3-4213-a731-722eba487210'),
('3bf95083-20ab-4ff1-ab85-4dee59e55e5e', 'TUESDAY', '13:00:00', '14:30:00', '2e2a4cad-396a-4e7c-ad59-1316ac37ecdf'),
('e54ddf86-2e1d-4209-b1cf-6067f0708a80', 'THURSDAY', '13:00:00', '14:30:00', '2e2a4cad-396a-4e7c-ad59-1316ac37ecdf'),
('629bbd1d-72eb-4cfc-892d-486fa8c23c2a', 'MONDAY', '14:30:00', '16:00:00', 'bee98bde-9bca-4a9e-a360-8ad495f45ef4'),
('676a10b3-8400-4bf6-8142-114c54e311de', 'WEDNESDAY', '14:30:00', '16:00:00', 'bee98bde-9bca-4a9e-a360-8ad495f45ef4'),
('11a80ef6-a678-4b36-9e16-1d1796fac991', 'TUESDAY', '16:00:00', '17:30:00', 'c18bfe41-6ad5-48d8-a59b-25945353dcec'),
('be18e912-54f8-4738-894a-35d56a30effa', 'THURSDAY', '16:00:00', '17:30:00', 'c18bfe41-6ad5-48d8-a59b-25945353dcec'),
('c754be86-fdd3-4929-a0fc-07220e7d5df6', 'TUESDAY', '13:00:00', '14:30:00', 'b7238b1b-ba1f-410a-96e7-8e5bac386dfa'),
('9f230344-f57e-4ad9-aeea-1f83eea5b646', 'THURSDAY', '13:00:00', '14:30:00', 'b7238b1b-ba1f-410a-96e7-8e5bac386dfa'),
('ff48b9a3-ee02-4bb3-86d6-9deeab7e5b13', 'MONDAY', '14:30:00', '16:00:00', '975e2b39-edc5-47de-8d37-65617854c084'),
('46629e28-7931-464b-bb77-02cc2fc1873f', 'WEDNESDAY', '14:30:00', '16:00:00', '975e2b39-edc5-47de-8d37-65617854c084'),
('b9f1060f-dd03-438a-9423-a61ea6fdbb21', 'TUESDAY', '07:30:00', '09:00:00', '6e63ea0d-79a8-4315-b990-edac8f989745'),
('cd0ef266-9d66-4aee-8f6c-338885f23cc4', 'THURSDAY', '07:30:00', '09:00:00', '6e63ea0d-79a8-4315-b990-edac8f989745'),
('6c4370f0-73b1-4522-8273-f311864f0842', 'MONDAY', '09:00:00', '10:30:00', '6542244f-e452-4b9d-badc-4dbc7541cfb8'),
('03bee0c4-52d2-4f58-838c-d5d8ef60ab4d', 'WEDNESDAY', '09:00:00', '10:30:00', '6542244f-e452-4b9d-badc-4dbc7541cfb8'),
('c6e76cc6-dc7f-4f52-b7e8-ec7b3ea159ca', 'TUESDAY', '10:30:00', '12:00:00', 'caf5017a-bb7c-46be-abc0-50103e7c3291'),
('6726216a-0df6-414f-a536-048e12ec4cee', 'THURSDAY', '10:30:00', '12:00:00', 'caf5017a-bb7c-46be-abc0-50103e7c3291'),
('1af083d9-55a7-4904-b8c7-418d55392230', 'MONDAY', '13:00:00', '14:30:00', '25efe848-d6d6-424f-82a6-a3344e52ff14'),
('5e7923e4-f464-403d-a6ac-a9ff082936ea', 'WEDNESDAY', '13:00:00', '14:30:00', '25efe848-d6d6-424f-82a6-a3344e52ff14'),
('5e94a4ca-5a02-4a41-8267-390dc8e144d3', 'TUESDAY', '14:30:00', '16:00:00', '3c41667a-d190-49d3-ab30-e2feb00ab72f'),
('5c06cad6-a411-415b-b9b1-61a25d136c18', 'THURSDAY', '14:30:00', '16:00:00', '3c41667a-d190-49d3-ab30-e2feb00ab72f'),
('f8e706e6-f478-462d-ac59-28a8242c6b8f', 'MONDAY', '13:00:00', '14:30:00', 'c0fe3db3-a4da-498e-9a29-508e1a3bd141'),
('a882a5a2-8fe3-4d77-a7c8-185e70e898ed', 'WEDNESDAY', '13:00:00', '14:30:00', 'c0fe3db3-a4da-498e-9a29-508e1a3bd141'),
('13332e6d-bb8e-40bf-8596-fdc8788094ba', 'TUESDAY', '14:30:00', '16:00:00', '72ad9722-fc71-46e1-a4c8-00cb0bcb2395'),
('91f3ae7d-c792-4ac2-af63-be0f4b27316b', 'THURSDAY', '14:30:00', '16:00:00', '72ad9722-fc71-46e1-a4c8-00cb0bcb2395'),
('414335a2-68d2-4a60-a582-42e967648e2f', 'MONDAY', '16:00:00', '17:30:00', '78c02143-11fe-4fa2-adc1-bd1eab3b47ac'),
('d532f737-2aef-4ae8-93d7-5cf61c92810f', 'WEDNESDAY', '16:00:00', '17:30:00', '78c02143-11fe-4fa2-adc1-bd1eab3b47ac'),
('57d13d66-d32a-4122-a4d0-59c0b5f9f884', 'MONDAY', '07:30:00', '09:00:00', '2430ef5a-7394-43b6-8b97-e8aefc9cf06b'),
('1d1a6ae3-1250-4ed5-8e7a-d097b4a7f628', 'WEDNESDAY', '07:30:00', '09:00:00', '2430ef5a-7394-43b6-8b97-e8aefc9cf06b'),
('25571656-bac1-46be-b933-bed3fbc3f019', 'TUESDAY', '10:30:00', '12:00:00', '6d2063da-067b-4dc5-8756-38acff1e005e'),
('da9e733e-ad4a-42ca-b60a-76cfe12f8990', 'THURSDAY', '10:30:00', '12:00:00', '6d2063da-067b-4dc5-8756-38acff1e005e'),
('585a5dcb-f332-4391-a884-64234316a15c', 'MONDAY', '13:00:00', '14:30:00', '068bb4c7-ce07-40bf-8402-2fabe6d7da59'),
('43833d2b-8c2b-45fc-bfca-ab8cca8a4f04', 'WEDNESDAY', '13:00:00', '14:30:00', '068bb4c7-ce07-40bf-8402-2fabe6d7da59'),
('fffe8130-c874-41b9-82d4-daf322005232', 'TUESDAY', '09:00:00', '10:30:00', '5fdb8e2c-3439-4711-abb6-8029f43c41ae'),
('a5f21614-a8d8-4f55-b825-9ff6751dfdb7', 'THURSDAY', '09:00:00', '10:30:00', '5fdb8e2c-3439-4711-abb6-8029f43c41ae'),
('7ca8a709-9dde-4deb-bafb-8ebcf22caa7c', 'MONDAY', '10:30:00', '12:00:00', 'd344330f-e920-4fac-9c14-8272327444e4'),
('661509f3-2bc6-4db7-87aa-9b91254dfa6e', 'WEDNESDAY', '10:30:00', '12:00:00', 'd344330f-e920-4fac-9c14-8272327444e4'),
('4ef2dac1-c151-4d41-8648-8eff925a2e44', 'TUESDAY', '16:00:00', '17:30:00', 'b3569361-09f0-422d-bb41-44e1d76266db'),
('3620a2ba-6d23-4ad3-b317-a4963b3fd3a8', 'THURSDAY', '16:00:00', '17:30:00', 'b3569361-09f0-422d-bb41-44e1d76266db'),
('2aacf639-b2d3-4657-83e2-285f935ef25a', 'MONDAY', '07:30:00', '09:00:00', '123103ee-fc0e-450f-baa9-74e3ff5a3def'),
('5b3f07cf-8de5-4570-8d76-bb12fc38edd5', 'WEDNESDAY', '07:30:00', '09:00:00', '123103ee-fc0e-450f-baa9-74e3ff5a3def'),
('ebfe9cf1-498b-43d8-a853-17933a233caa', 'TUESDAY', '09:00:00', '10:30:00', '37a4105a-0a05-4b6c-b972-93624bec41b9'),
('ba984221-0cd6-45c6-b874-64306fff53bb', 'THURSDAY', '09:00:00', '10:30:00', '37a4105a-0a05-4b6c-b972-93624bec41b9'),
('f1837e8f-26a5-44f9-aa45-8d27ea2cc563', 'TUESDAY', '16:00:00', '17:30:00', 'd529d875-802a-4e8a-a7b7-56c94b684ef9'),
('7a7b01e6-28f5-42a6-9c6b-1dc104e3aac1', 'THURSDAY', '16:00:00', '17:30:00', 'd529d875-802a-4e8a-a7b7-56c94b684ef9'),
('b94fe933-b628-4bfd-86b1-fbf6576e410d', 'TUESDAY', '07:30:00', '09:00:00', 'cdb3bd69-2541-467f-bac0-ed2a75f882e4'),
('a4140dec-3c76-4617-99cc-6ab708725573', 'THURSDAY', '07:30:00', '09:00:00', 'cdb3bd69-2541-467f-bac0-ed2a75f882e4'),
('248c3971-6237-4d4d-bfd8-154f6860f811', 'MONDAY', '16:00:00', '17:30:00', 'cc86f1bb-6743-4630-9c45-7fc88d50e9dc'),
('189578d0-ee64-44fd-bb7d-d79a216ffc9e', 'WEDNESDAY', '16:00:00', '17:30:00', 'cc86f1bb-6743-4630-9c45-7fc88d50e9dc'),
('35657a43-aef4-4a77-9ab0-e8be0f4677a2', 'TUESDAY', '14:30:00', '16:00:00', '96f13f5c-b050-45e8-ad82-52712f0f6ea7'),
('82536ca3-eb35-4d0b-b242-ee9c14af5dae', 'THURSDAY', '14:30:00', '16:00:00', '96f13f5c-b050-45e8-ad82-52712f0f6ea7'),
('2220bf8e-6c7b-4464-97af-8911649a3d55', 'MONDAY', '16:00:00', '17:30:00', 'd122d0fb-e4b1-44dc-8745-cc0d1b1a1417'),
('beaa0b30-bea4-4d5a-97b4-54b61fe1c101', 'WEDNESDAY', '16:00:00', '17:30:00', 'd122d0fb-e4b1-44dc-8745-cc0d1b1a1417'),
('723dd09e-8210-499a-8266-3d5e30b0f3be', 'MONDAY', '07:30:00', '09:00:00', '9c998982-1a6a-4c17-8319-de4dfa507ed8'),
('b314bb12-08ce-478b-a363-336af46ec72a', 'WEDNESDAY', '07:30:00', '09:00:00', '9c998982-1a6a-4c17-8319-de4dfa507ed8'),
('af671aa1-6776-478a-9b08-6c9501e79322', 'TUESDAY', '13:00:00', '14:30:00', '66caa159-6901-4e07-9ef2-2b3281ed98c5'),
('db892f84-bc80-4ec7-bb15-64ac732255b6', 'THURSDAY', '13:00:00', '14:30:00', '66caa159-6901-4e07-9ef2-2b3281ed98c5'),
('0a4b942e-c5b3-4d65-8759-5544f2457b05', 'MONDAY', '10:30:00', '12:00:00', '2b18cba4-4236-4803-8720-42cd54dfa762'),
('ce23b8d1-9d42-488f-98d1-41bb97aec109', 'WEDNESDAY', '10:30:00', '12:00:00', '2b18cba4-4236-4803-8720-42cd54dfa762'),
('a37b902c-4fb4-454b-b94f-1f071ac042ec', 'TUESDAY', '13:00:00', '14:30:00', 'cd629656-f334-4ab2-bd80-90dc5d8b8317'),
('774e2a39-a7da-422e-8a95-79420fea5ff1', 'THURSDAY', '13:00:00', '14:30:00', 'cd629656-f334-4ab2-bd80-90dc5d8b8317'),
('7cd4dd34-218c-4ecb-abd6-c4c65bddb1fb', 'MONDAY', '14:30:00', '16:00:00', '82ea2894-b2e3-44e7-aea9-5330a9cc0491'),
('a4f9c0a7-1ecb-42a1-8481-169cebc354f6', 'WEDNESDAY', '14:30:00', '16:00:00', '82ea2894-b2e3-44e7-aea9-5330a9cc0491'),
('400217f9-4d60-4f1c-a952-e79ab5f26080', 'MONDAY', '09:00:00', '10:30:00', 'e8177ab6-a4f3-4be7-9a87-20c3e1202c8e'),
('cd50847e-005d-4c76-86a1-6006eb6f814a', 'WEDNESDAY', '09:00:00', '10:30:00', 'e8177ab6-a4f3-4be7-9a87-20c3e1202c8e'),
('a91d409c-69a2-47af-80a2-e26a831bae5f', 'TUESDAY', '10:30:00', '12:00:00', '078d52e6-4567-49fb-8b6f-ba8b774c2c90'),
('4ca2d91d-10b1-4bab-95b2-9e5c6bd43954', 'THURSDAY', '10:30:00', '12:00:00', '078d52e6-4567-49fb-8b6f-ba8b774c2c90'),
('6a616544-17b9-4c18-8392-699f972ba2a7', 'SATURDAY', '13:00:00', '16:00:00', '9db2bdfd-6167-4e42-982d-75d0c2f53f10'),
('5a73b60f-8185-4dba-961b-b01320adb96e', 'FRIDAY', '08:00:00', '10:00:00', '9db2bdfd-6167-4e42-982d-75d0c2f53f10'),
('0872d2a0-9685-4d21-bb7e-674af1af406e', 'FRIDAY', '10:00:00', '12:00:00', '9db2bdfd-6167-4e42-982d-75d0c2f53f10'),
('7ab6487d-d8f1-4a3a-8acb-9c59e77adc5b', 'SATURDAY', '08:00:00', '11:00:00', '9db2bdfd-6167-4e42-982d-75d0c2f53f10'),
('f206dd35-a0cb-4e0f-a86b-8290b6aae9a7', 'FRIDAY', '13:00:00', '15:00:00', '9db2bdfd-6167-4e42-982d-75d0c2f53f10'),
('bcb779cf-115a-4f20-a7c0-1089e50d8a8d', 'FRIDAY', '15:00:00', '17:00:00', '9db2bdfd-6167-4e42-982d-75d0c2f53f10');

-- 3. sections (50)  [section_code | subject | faculty]
INSERT INTO sections (id, section_code, capacity, current_count, version, faculty_id, subject_id) VALUES
-- CS-F1 CS111 (EMP-001)
('b9aec92b-4a66-47cf-99e0-06605ba026e6', 'CS-F1', 40, 0, 0, 'bc3e8159-cea6-4f31-adac-d552f537ceed', 'e12e3be1-af45-4f0c-882d-721f08103438'),
-- CS-F1 CS112 (EMP-001)
('9e097c29-b11d-4be1-9012-ca62aef0ba74', 'CS-F1', 40, 0, 0, 'bc3e8159-cea6-4f31-adac-d552f537ceed', '5a454a83-2e62-4ca7-aa5f-d1ace1b3e59f'),
-- CS-F2 CS211 (EMP-001)
('05cb84e4-dfe2-4c9d-a6b7-de38e2af82d5', 'CS-F2', 40, 0, 0, 'bc3e8159-cea6-4f31-adac-d552f537ceed', '08b44dcd-b9dd-4511-ba96-aad042f4b860'),
-- CS-F2 CS212 (EMP-001)
('0b31a307-7a02-4d61-aaad-6a1e958737a0', 'CS-F2', 40, 0, 0, 'bc3e8159-cea6-4f31-adac-d552f537ceed', 'a7a9657d-e020-4b0f-acae-480f5f9ef508'),
-- CS-F2 CS213 (EMP-001)
('e38e8727-af6b-4317-8992-05d9b2b100ae', 'CS-F2', 40, 0, 0, 'bc3e8159-cea6-4f31-adac-d552f537ceed', 'e9c915af-3253-4be5-bf32-9286d7978e63'),
-- CS-F2 CS214 (EMP-001)
('468167af-d9d9-45a7-a59c-83f279534255', 'CS-F2', 40, 0, 0, 'bc3e8159-cea6-4f31-adac-d552f537ceed', '953f1770-2e48-46a3-b2c6-1cf2583d3a0a'),
-- CS-F3 CS311 (EMP-001)
('1fc98fa6-3427-4d79-9de2-96947f0499d6', 'CS-F3', 40, 0, 0, 'bc3e8159-cea6-4f31-adac-d552f537ceed', 'c14e82bd-65f5-4164-ada7-df2b77789c25'),
-- CS-F3 CS312 (FAC-101)
('f1be63b2-23c3-43fb-8bae-a543e9a05b67', 'CS-F3', 40, 0, 0, 'b4c9f55c-684a-464c-aafd-bab4e338e49c', '0b0ceee9-9e7e-480e-bf16-a00cf1f59101'),
-- CS-F3 CS313 (FAC-102)
('c6c2c6a2-8a6e-49e5-9c33-cd632980dd13', 'CS-F3', 40, 0, 0, 'cba715ed-30bb-4ef5-9a31-6174391a7a0e', '650ccc28-86dd-49cc-b2a7-c9d569908892'),
-- CS-F3 CS314 (FAC-103)
('cf6b464c-d96f-49e2-94cf-17f29e38729b', 'CS-F3', 40, 0, 0, '54718343-611e-4786-a1a4-5148448ecd56', 'c83310ac-239f-4551-a343-571765663234'),
-- CS-F3 CS315 (FAC-104)
('75d4e238-7d37-4e0e-9dbd-3419b09db655', 'CS-F3', 40, 0, 0, 'c6c774cd-55ed-468c-83cb-79adaeacb82d', '3d4e989d-5e0e-4c41-b9c5-a4a1e2846ada'),
-- CS-F4 CS411 (FAC-105)
('b9955915-ba62-4e06-a69a-39853544b286', 'CS-F4', 40, 0, 0, 'cbb104f6-9068-450f-95bc-8c891f90c994', '786a0f35-e936-4173-a13c-58e30e14e175'),
-- CS-F4 CS412 (FAC-101)
('a3d6eff5-c8fd-4ee0-b170-c9375c74c268', 'CS-F4', 40, 0, 0, 'b4c9f55c-684a-464c-aafd-bab4e338e49c', 'fb627297-1436-4af6-995b-81cf680e2d61'),
-- CS-F4 CS413 (FAC-102)
('b4d07e86-e211-452b-9b7b-7af2f0c15a25', 'CS-F4', 40, 0, 0, 'cba715ed-30bb-4ef5-9a31-6174391a7a0e', 'e08c54e4-5eca-44d5-a6a6-0a53b14db725'),
-- IT-G2 IT211 (EMP-002)
('b3da21c0-8675-4c13-be4a-18a58730a215', 'IT-G2', 40, 0, 0, 'af3e72a2-b604-4e63-811d-8375115fcabf', 'c2f7eb91-5927-4ad0-b7d4-48cd2031582e'),
-- IT-G2 IT212 (EMP-003)
('7372060c-178c-416a-a4ec-ba6d2f597e30', 'IT-G2', 40, 0, 0, '7f819dc4-a8b9-4eb6-98ce-653cbdc0bec8', '4e0f299d-8177-46d8-9180-f87eeeb463ff'),
-- IT-G3 IT311 (EMP-002)
('e24e0d0e-7df4-4827-bb3b-14aa64673d09', 'IT-G3', 40, 0, 0, 'af3e72a2-b604-4e63-811d-8375115fcabf', 'b51645f7-943a-44df-addb-78ce4f2de3ab'),
-- IT-G3 IT312 (EMP-003)
('9c5405fe-05fa-45c5-995e-e5ecc418a00e', 'IT-G3', 40, 0, 0, '7f819dc4-a8b9-4eb6-98ce-653cbdc0bec8', '74cff77e-f85d-45c6-aa79-e560ab862247'),
-- IT-G3 IT313 (EMP-002)
('a364fe7d-ccae-417a-b8e6-a89732bd27ce', 'IT-G3', 40, 0, 0, 'af3e72a2-b604-4e63-811d-8375115fcabf', '6ddd024d-98aa-4efa-8ac7-e1a2780aa1f3'),
-- IT-G3 IT314 (EMP-003)
('cdd3a697-8859-48c3-9b81-a30f7ff3e67c', 'IT-G3', 40, 0, 0, '7f819dc4-a8b9-4eb6-98ce-653cbdc0bec8', '3bb0e5ef-5560-4bf6-bf27-1e30d19d0004'),
-- IT-G3 IT317 (EMP-002)
('612703f8-c19a-4e9f-8532-28936670a03d', 'IT-G3', 40, 0, 0, 'af3e72a2-b604-4e63-811d-8375115fcabf', '5f2fbaa5-b887-40aa-9a94-00d9f3a83a42'),
-- IT-G4 IT411 (EMP-002)
('65970243-0bbd-4356-9251-2138ee77225a', 'IT-G4', 40, 0, 0, 'af3e72a2-b604-4e63-811d-8375115fcabf', '94367d65-5fe2-4dec-8d3c-692be61373e8'),
-- IT-G4 IT412 (EMP-003)
('91640669-8ce5-45b8-a605-9b2adc8d753c', 'IT-G4', 40, 0, 0, '7f819dc4-a8b9-4eb6-98ce-653cbdc0bec8', '70786959-4508-4e06-9392-28bd34cd01d2'),
-- IT-G4 IT413 (EMP-003)
('d9a86095-630d-4e65-b448-990febaf5aca', 'IT-G4', 40, 0, 0, '7f819dc4-a8b9-4eb6-98ce-653cbdc0bec8', 'e50dd9a5-456b-4fb1-b455-eb796c9c183b'),
-- IT-G4 IT414 (EMP-002)
('f637c912-fc98-41a7-ba27-db9103e41b4a', 'IT-G4', 40, 0, 0, 'af3e72a2-b604-4e63-811d-8375115fcabf', '4aa48839-2814-42bd-af70-7d0c850b7056'),
-- CS-F1 CSIT111 (FAC-103)
('87d756aa-231c-40aa-acbf-5fe858a5f70d', 'CS-F1', 40, 0, 0, '54718343-611e-4786-a1a4-5148448ecd56', '119937ec-4cb2-41da-8231-7249a4bd2b48'),
-- CS-F1 CSIT121 (FAC-104)
('51098a1c-8411-4a6c-b9bd-63ce5cbb6a08', 'CS-F1', 40, 0, 0, 'c6c774cd-55ed-468c-83cb-79adaeacb82d', 'eeff7c7d-e8fb-44b4-83dd-3f2802dc2f22'),
-- CS-F2 CSIT221 (FAC-105)
('729982b8-577c-4f5a-bb7f-a107890160e2', 'CS-F2', 40, 0, 0, 'cbb104f6-9068-450f-95bc-8c891f90c994', 'f330ae80-2fef-4ac9-a21f-91393fbe1b23'),
-- CS-F2 CSIT227 (FAC-101)
('c70d27a0-617b-4101-88b4-0d27bee5bbdf', 'CS-F2', 40, 0, 0, 'b4c9f55c-684a-464c-aafd-bab4e338e49c', '2a13f2b8-f8da-4dd1-8a44-c52a297d6899'),
-- CS-F3 CSIT321 (FAC-103)
('afc65595-a3d8-4b39-aa07-78fa73c1f047', 'CS-F3', 40, 0, 0, '54718343-611e-4786-a1a4-5148448ecd56', '1f3f6edf-06ee-4833-9c65-29efc24077e3'),
-- IT-G1 CSIT111 (FAC-102)
('25a6738c-253a-4498-8977-84b0e4e16390', 'IT-G1', 40, 0, 0, 'cba715ed-30bb-4ef5-9a31-6174391a7a0e', '119937ec-4cb2-41da-8231-7249a4bd2b48'),
-- IT-G1 CSIT121 (FAC-104)
('e2b97ea6-2baa-4573-be84-e84e6be8d5bf', 'IT-G1', 40, 0, 0, 'c6c774cd-55ed-468c-83cb-79adaeacb82d', 'eeff7c7d-e8fb-44b4-83dd-3f2802dc2f22'),
-- IT-G2 CSIT221 (FAC-105)
('f87f05bb-703f-4939-80bd-4a61517b9f73', 'IT-G2', 40, 0, 0, 'cbb104f6-9068-450f-95bc-8c891f90c994', 'f330ae80-2fef-4ac9-a21f-91393fbe1b23'),
-- IT-G2 CSIT227 (FAC-101)
('acc04c9e-5062-43a5-8a81-c0ba12585adb', 'IT-G2', 40, 0, 0, 'b4c9f55c-684a-464c-aafd-bab4e338e49c', '2a13f2b8-f8da-4dd1-8a44-c52a297d6899'),
-- IT-G3 CSIT321 (FAC-102)
('d0ff39b7-0589-4a6e-a71b-23877dfdb66d', 'IT-G3', 40, 0, 0, 'cba715ed-30bb-4ef5-9a31-6174391a7a0e', '1f3f6edf-06ee-4833-9c65-29efc24077e3'),
-- CS-F1 ENGL111 (FAC-103)
('b991913a-faf4-4996-9c1a-69722af69e76', 'CS-F1', 40, 0, 0, '54718343-611e-4786-a1a4-5148448ecd56', 'd0b72a81-8106-4fc0-aca8-e668da55fef8'),
-- CS-F1 MATH111 (FAC-104)
('810c297a-d5d4-40f3-8e61-ca1e283a5c89', 'CS-F1', 40, 0, 0, 'c6c774cd-55ed-468c-83cb-79adaeacb82d', '8fcc42a9-08a9-4cb3-9420-464e2f737619'),
-- CS-F1 PHILO111 (FAC-105)
('141b668c-714d-4152-97e2-5651c6779919', 'CS-F1', 40, 0, 0, 'cbb104f6-9068-450f-95bc-8c891f90c994', '55635ceb-1fa5-42d0-95f7-f2cd6726022d'),
-- CS-F2 STAT211 (FAC-101)
('2521d022-1281-4fb1-beff-1f80d21d4c89', 'CS-F2', 40, 0, 0, 'b4c9f55c-684a-464c-aafd-bab4e338e49c', '63e10ad9-7f1f-40de-b58e-509ece4ba1bd'),
-- IT-G1 ENGL031 (FAC-103)
('8c91799b-5474-458c-af3b-8d16712afc68', 'IT-G1', 40, 0, 0, '54718343-611e-4786-a1a4-5148448ecd56', '20f6b895-7675-4f41-9f40-6bfb50c0fbff'),
-- IT-G1 MATH031 (FAC-102)
('85b9bca8-e0f5-41c3-926f-1470f968d396', 'IT-G1', 40, 0, 0, 'cba715ed-30bb-4ef5-9a31-6174391a7a0e', 'e2262eab-9c54-45b4-9374-e846543d6f1a'),
-- IT-G1 PHILO031 (FAC-105)
('e70a4fff-49b9-4f68-8ffe-7ef4f424d7da', 'IT-G1', 40, 0, 0, 'cbb104f6-9068-450f-95bc-8c891f90c994', 'e8384211-f41d-43d3-a94c-3738a80dd611'),
-- IT-G2 MATH032 (FAC-104)
('6b867917-1aa8-4eef-ac02-326f4752172e', 'IT-G2', 40, 0, 0, 'c6c774cd-55ed-468c-83cb-79adaeacb82d', 'f53b4b6b-9921-4c6d-a2d5-0ed547b52afe'),
-- IT-G2 STAT211 (FAC-101)
('494bef55-69c3-471e-87dd-7673ab83f397', 'IT-G2', 40, 0, 0, 'b4c9f55c-684a-464c-aafd-bab4e338e49c', '63e10ad9-7f1f-40de-b58e-509ece4ba1bd'),
-- CS-F1 NSTP101 (FAC-102)
('9d7b9b5b-aac0-4212-a83c-69d061c1aacc', 'CS-F1', 40, 0, 0, 'cba715ed-30bb-4ef5-9a31-6174391a7a0e', 'a77d25ac-277f-4940-8d45-1cbe68546654'),
-- CS-F1 PE101 (FAC-103)
('48e4dd28-25fe-4db7-829f-42b17512723b', 'CS-F1', 40, 0, 0, '54718343-611e-4786-a1a4-5148448ecd56', '9e898264-c446-4d73-a673-7de974d87e04'),
-- CS-F2 PE201 (FAC-104)
('3078ac37-661f-4a4f-8fb6-a354365a98f3', 'CS-F2', 40, 0, 0, 'c6c774cd-55ed-468c-83cb-79adaeacb82d', '77c0e441-cbc9-4177-bba4-5b539a65fac8'),
-- IT-G1 NSTP101 (FAC-105)
('4ac090fb-14c5-4fc5-9b76-e5903239b475', 'IT-G1', 40, 0, 0, 'cbb104f6-9068-450f-95bc-8c891f90c994', 'a77d25ac-277f-4940-8d45-1cbe68546654'),
-- IT-G1 PE101 (FAC-101)
('9e73a759-0d78-46bb-8159-fb076941307c', 'IT-G1', 40, 0, 0, 'b4c9f55c-684a-464c-aafd-bab4e338e49c', '9e898264-c446-4d73-a673-7de974d87e04'),
-- IT-G2 PE201 (FAC-102)
('eabc4fd4-d7af-4d5d-bb1f-a84c5d00325b', 'IT-G2', 40, 0, 0, 'cba715ed-30bb-4ef5-9a31-6174391a7a0e', '77c0e441-cbc9-4177-bba4-5b539a65fac8');

-- 4. section_schedules (94)
INSERT INTO section_schedules (section_id, schedule_id) VALUES
('b9aec92b-4a66-47cf-99e0-06605ba026e6', '72c6cddd-c496-4958-8fab-8b77af9304e8'),
('b9aec92b-4a66-47cf-99e0-06605ba026e6', 'ea12074e-ad4f-4ecf-ac8d-b5bd88e740eb'),
('9e097c29-b11d-4be1-9012-ca62aef0ba74', '514dccf2-ca4e-4437-b067-48e6d17c9d87'),
('9e097c29-b11d-4be1-9012-ca62aef0ba74', '0093f5dd-8940-4b59-8374-64a7fc939bfd'),
('05cb84e4-dfe2-4c9d-a6b7-de38e2af82d5', '261396dc-2e35-4f05-b3d3-dde0c39ef171'),
('05cb84e4-dfe2-4c9d-a6b7-de38e2af82d5', '7c04b65f-7901-4cc5-94e0-b9b9e6509bd2'),
('0b31a307-7a02-4d61-aaad-6a1e958737a0', '6c4d7636-a5c8-4179-8f4f-753f237c9ca7'),
('0b31a307-7a02-4d61-aaad-6a1e958737a0', '955490d7-9d0a-4231-b98d-f3722d9f324e'),
('e38e8727-af6b-4317-8992-05d9b2b100ae', 'ae8be0a2-f69f-498e-a58c-d25dff2b68d5'),
('e38e8727-af6b-4317-8992-05d9b2b100ae', '09314a27-85b6-4f90-ab1b-2da8307965f5'),
('468167af-d9d9-45a7-a59c-83f279534255', '9f173e14-03db-458f-ae4b-3a28b20d6fdd'),
('468167af-d9d9-45a7-a59c-83f279534255', '4f912a93-ac67-4a7c-956d-b3fe982196e0'),
('1fc98fa6-3427-4d79-9de2-96947f0499d6', '9a84f036-a66d-43fc-93f1-b4b2d0fe5e48'),
('1fc98fa6-3427-4d79-9de2-96947f0499d6', 'ba15194f-bf94-48ae-b46e-8e0cabf1d190'),
('f1be63b2-23c3-43fb-8bae-a543e9a05b67', '5ec660dd-4054-4bd0-a418-15146cd36900'),
('f1be63b2-23c3-43fb-8bae-a543e9a05b67', 'ede48bc1-7a92-496c-a655-66ed00b569c3'),
('c6c2c6a2-8a6e-49e5-9c33-cd632980dd13', '3d83205d-79ee-44d9-a88b-fb21e6ef490f'),
('c6c2c6a2-8a6e-49e5-9c33-cd632980dd13', '608060c8-76eb-45dd-ae04-23593500dbee'),
('cf6b464c-d96f-49e2-94cf-17f29e38729b', '1c56463d-11d8-40ca-9ec0-5e896ea7809c'),
('cf6b464c-d96f-49e2-94cf-17f29e38729b', 'bed5c5aa-dc0b-42a1-9a3a-3d5fa788ff78'),
('75d4e238-7d37-4e0e-9dbd-3419b09db655', '2f44ab1d-c71b-4609-8396-8da9cd5e12b4'),
('75d4e238-7d37-4e0e-9dbd-3419b09db655', '9b037321-325e-4425-9af0-7c668d5c8384'),
('b9955915-ba62-4e06-a69a-39853544b286', '3bf95083-20ab-4ff1-ab85-4dee59e55e5e'),
('b9955915-ba62-4e06-a69a-39853544b286', 'e54ddf86-2e1d-4209-b1cf-6067f0708a80'),
('a3d6eff5-c8fd-4ee0-b170-c9375c74c268', '629bbd1d-72eb-4cfc-892d-486fa8c23c2a'),
('a3d6eff5-c8fd-4ee0-b170-c9375c74c268', '676a10b3-8400-4bf6-8142-114c54e311de'),
('b4d07e86-e211-452b-9b7b-7af2f0c15a25', '11a80ef6-a678-4b36-9e16-1d1796fac991'),
('b4d07e86-e211-452b-9b7b-7af2f0c15a25', 'be18e912-54f8-4738-894a-35d56a30effa'),
('b3da21c0-8675-4c13-be4a-18a58730a215', 'c754be86-fdd3-4929-a0fc-07220e7d5df6'),
('b3da21c0-8675-4c13-be4a-18a58730a215', '9f230344-f57e-4ad9-aeea-1f83eea5b646'),
('7372060c-178c-416a-a4ec-ba6d2f597e30', 'ff48b9a3-ee02-4bb3-86d6-9deeab7e5b13'),
('7372060c-178c-416a-a4ec-ba6d2f597e30', '46629e28-7931-464b-bb77-02cc2fc1873f'),
('e24e0d0e-7df4-4827-bb3b-14aa64673d09', 'b9f1060f-dd03-438a-9423-a61ea6fdbb21'),
('e24e0d0e-7df4-4827-bb3b-14aa64673d09', 'cd0ef266-9d66-4aee-8f6c-338885f23cc4'),
('9c5405fe-05fa-45c5-995e-e5ecc418a00e', '6c4370f0-73b1-4522-8273-f311864f0842'),
('9c5405fe-05fa-45c5-995e-e5ecc418a00e', '03bee0c4-52d2-4f58-838c-d5d8ef60ab4d'),
('a364fe7d-ccae-417a-b8e6-a89732bd27ce', 'c6e76cc6-dc7f-4f52-b7e8-ec7b3ea159ca'),
('a364fe7d-ccae-417a-b8e6-a89732bd27ce', '6726216a-0df6-414f-a536-048e12ec4cee'),
('cdd3a697-8859-48c3-9b81-a30f7ff3e67c', '1af083d9-55a7-4904-b8c7-418d55392230'),
('cdd3a697-8859-48c3-9b81-a30f7ff3e67c', '5e7923e4-f464-403d-a6ac-a9ff082936ea'),
('612703f8-c19a-4e9f-8532-28936670a03d', '5e94a4ca-5a02-4a41-8267-390dc8e144d3'),
('612703f8-c19a-4e9f-8532-28936670a03d', '5c06cad6-a411-415b-b9b1-61a25d136c18'),
('65970243-0bbd-4356-9251-2138ee77225a', 'f8e706e6-f478-462d-ac59-28a8242c6b8f'),
('65970243-0bbd-4356-9251-2138ee77225a', 'a882a5a2-8fe3-4d77-a7c8-185e70e898ed'),
('91640669-8ce5-45b8-a605-9b2adc8d753c', '13332e6d-bb8e-40bf-8596-fdc8788094ba'),
('91640669-8ce5-45b8-a605-9b2adc8d753c', '91f3ae7d-c792-4ac2-af63-be0f4b27316b'),
('d9a86095-630d-4e65-b448-990febaf5aca', '414335a2-68d2-4a60-a582-42e967648e2f'),
('d9a86095-630d-4e65-b448-990febaf5aca', 'd532f737-2aef-4ae8-93d7-5cf61c92810f'),
('f637c912-fc98-41a7-ba27-db9103e41b4a', '57d13d66-d32a-4122-a4d0-59c0b5f9f884'),
('f637c912-fc98-41a7-ba27-db9103e41b4a', '1d1a6ae3-1250-4ed5-8e7a-d097b4a7f628'),
('87d756aa-231c-40aa-acbf-5fe858a5f70d', '25571656-bac1-46be-b933-bed3fbc3f019'),
('87d756aa-231c-40aa-acbf-5fe858a5f70d', 'da9e733e-ad4a-42ca-b60a-76cfe12f8990'),
('51098a1c-8411-4a6c-b9bd-63ce5cbb6a08', '585a5dcb-f332-4391-a884-64234316a15c'),
('51098a1c-8411-4a6c-b9bd-63ce5cbb6a08', '43833d2b-8c2b-45fc-bfca-ab8cca8a4f04'),
('729982b8-577c-4f5a-bb7f-a107890160e2', 'fffe8130-c874-41b9-82d4-daf322005232'),
('729982b8-577c-4f5a-bb7f-a107890160e2', 'a5f21614-a8d8-4f55-b825-9ff6751dfdb7'),
('c70d27a0-617b-4101-88b4-0d27bee5bbdf', '7ca8a709-9dde-4deb-bafb-8ebcf22caa7c'),
('c70d27a0-617b-4101-88b4-0d27bee5bbdf', '661509f3-2bc6-4db7-87aa-9b91254dfa6e'),
('afc65595-a3d8-4b39-aa07-78fa73c1f047', '4ef2dac1-c151-4d41-8648-8eff925a2e44'),
('afc65595-a3d8-4b39-aa07-78fa73c1f047', '3620a2ba-6d23-4ad3-b317-a4963b3fd3a8'),
('25a6738c-253a-4498-8977-84b0e4e16390', '2aacf639-b2d3-4657-83e2-285f935ef25a'),
('25a6738c-253a-4498-8977-84b0e4e16390', '5b3f07cf-8de5-4570-8d76-bb12fc38edd5'),
('e2b97ea6-2baa-4573-be84-e84e6be8d5bf', 'ebfe9cf1-498b-43d8-a853-17933a233caa'),
('e2b97ea6-2baa-4573-be84-e84e6be8d5bf', 'ba984221-0cd6-45c6-b874-64306fff53bb'),
('f87f05bb-703f-4939-80bd-4a61517b9f73', 'f1837e8f-26a5-44f9-aa45-8d27ea2cc563'),
('f87f05bb-703f-4939-80bd-4a61517b9f73', '7a7b01e6-28f5-42a6-9c6b-1dc104e3aac1'),
('acc04c9e-5062-43a5-8a81-c0ba12585adb', 'b94fe933-b628-4bfd-86b1-fbf6576e410d'),
('acc04c9e-5062-43a5-8a81-c0ba12585adb', 'a4140dec-3c76-4617-99cc-6ab708725573'),
('d0ff39b7-0589-4a6e-a71b-23877dfdb66d', '248c3971-6237-4d4d-bfd8-154f6860f811'),
('d0ff39b7-0589-4a6e-a71b-23877dfdb66d', '189578d0-ee64-44fd-bb7d-d79a216ffc9e'),
('b991913a-faf4-4996-9c1a-69722af69e76', '35657a43-aef4-4a77-9ab0-e8be0f4677a2'),
('b991913a-faf4-4996-9c1a-69722af69e76', '82536ca3-eb35-4d0b-b242-ee9c14af5dae'),
('810c297a-d5d4-40f3-8e61-ca1e283a5c89', '2220bf8e-6c7b-4464-97af-8911649a3d55'),
('810c297a-d5d4-40f3-8e61-ca1e283a5c89', 'beaa0b30-bea4-4d5a-97b4-54b61fe1c101'),
('141b668c-714d-4152-97e2-5651c6779919', '723dd09e-8210-499a-8266-3d5e30b0f3be'),
('141b668c-714d-4152-97e2-5651c6779919', 'b314bb12-08ce-478b-a363-336af46ec72a'),
('2521d022-1281-4fb1-beff-1f80d21d4c89', 'af671aa1-6776-478a-9b08-6c9501e79322'),
('2521d022-1281-4fb1-beff-1f80d21d4c89', 'db892f84-bc80-4ec7-bb15-64ac732255b6'),
('8c91799b-5474-458c-af3b-8d16712afc68', '0a4b942e-c5b3-4d65-8759-5544f2457b05'),
('8c91799b-5474-458c-af3b-8d16712afc68', 'ce23b8d1-9d42-488f-98d1-41bb97aec109'),
('85b9bca8-e0f5-41c3-926f-1470f968d396', 'a37b902c-4fb4-454b-b94f-1f071ac042ec'),
('85b9bca8-e0f5-41c3-926f-1470f968d396', '774e2a39-a7da-422e-8a95-79420fea5ff1'),
('e70a4fff-49b9-4f68-8ffe-7ef4f424d7da', '7cd4dd34-218c-4ecb-abd6-c4c65bddb1fb'),
('e70a4fff-49b9-4f68-8ffe-7ef4f424d7da', 'a4f9c0a7-1ecb-42a1-8481-169cebc354f6'),
('6b867917-1aa8-4eef-ac02-326f4752172e', '400217f9-4d60-4f1c-a952-e79ab5f26080'),
('6b867917-1aa8-4eef-ac02-326f4752172e', 'cd50847e-005d-4c76-86a1-6006eb6f814a'),
('494bef55-69c3-471e-87dd-7673ab83f397', 'a91d409c-69a2-47af-80a2-e26a831bae5f'),
('494bef55-69c3-471e-87dd-7673ab83f397', '4ca2d91d-10b1-4bab-95b2-9e5c6bd43954'),
('9d7b9b5b-aac0-4212-a83c-69d061c1aacc', '6a616544-17b9-4c18-8392-699f972ba2a7'),
('48e4dd28-25fe-4db7-829f-42b17512723b', '5a73b60f-8185-4dba-961b-b01320adb96e'),
('3078ac37-661f-4a4f-8fb6-a354365a98f3', '0872d2a0-9685-4d21-bb7e-674af1af406e'),
('4ac090fb-14c5-4fc5-9b76-e5903239b475', '7ab6487d-d8f1-4a3a-8acb-9c59e77adc5b'),
('9e73a759-0d78-46bb-8159-fb076941307c', 'f206dd35-a0cb-4e0f-a86b-8290b6aae9a7'),
('eabc4fd4-d7af-4d5d-bb1f-a84c5d00325b', 'bcb779cf-115a-4f20-a7c0-1089e50d8a8d');

COMMIT;

-- =====================================================================
-- VERIFICATION: every query below must return 0 rows
-- =====================================================================
-- Check 1: room overlap
SELECT s1.id, s2.id, s1.room_id, s1.day_of_week FROM schedules s1
JOIN schedules s2 ON s1.room_id=s2.room_id AND s1.day_of_week=s2.day_of_week AND s1.id<s2.id
WHERE s1.start_time<s2.end_time AND s2.start_time<s1.end_time;

-- Check 2: faculty overlap
SELECT sec1.faculty_id, sec1.section_code, sec2.section_code, sch1.day_of_week
FROM section_schedules ss1
JOIN section_schedules ss2 ON ss1.section_id<ss2.section_id
JOIN sections sec1 ON ss1.section_id=sec1.id
JOIN sections sec2 ON ss2.section_id=sec2.id
JOIN schedules sch1 ON ss1.schedule_id=sch1.id
JOIN schedules sch2 ON ss2.schedule_id=sch2.id
WHERE sec1.faculty_id=sec2.faculty_id AND sch1.day_of_week=sch2.day_of_week
  AND sch1.start_time<sch2.end_time AND sch2.start_time<sch1.end_time;

-- Check 3: section capacity > room capacity
SELECT sec.id, sec.section_code, sec.capacity, r.room_name, r.capacity
FROM sections sec JOIN section_schedules ss ON sec.id=ss.section_id
JOIN schedules sch ON ss.schedule_id=sch.id JOIN rooms r ON sch.room_id=r.id
WHERE sec.capacity>r.capacity;

-- Check 4: current_count out of sync with enrollments
SELECT sec.id, sec.section_code, sec.current_count, COUNT(e.id) AS actual
FROM sections sec LEFT JOIN enrollments e ON sec.id=e.section_id AND e.status IN ('PENDING','ENROLLED')
GROUP BY sec.id, sec.section_code, sec.current_count HAVING sec.current_count<>COUNT(e.id);

-- Check 5: same block (section_code) has two subjects overlapping -> student clash
SELECT a.section_code, a.id, b.id, sa.day_of_week
FROM sections a JOIN sections b ON a.section_code=b.section_code AND a.id<b.id
JOIN section_schedules x ON x.section_id=a.id JOIN schedules sa ON sa.id=x.schedule_id
JOIN section_schedules y ON y.section_id=b.id JOIN schedules sb ON sb.id=y.schedule_id
WHERE sa.day_of_week=sb.day_of_week AND sa.start_time<sb.end_time AND sb.start_time<sa.end_time;

-- Check 6: a schedule row linked to more than one section
SELECT schedule_id, COUNT(*) FROM section_schedules GROUP BY schedule_id HAVING COUNT(*)>1;

-- Check 7: sections missing faculty or schedule
SELECT sec.id, sec.section_code FROM sections sec
LEFT JOIN section_schedules ss ON ss.section_id=sec.id
WHERE sec.faculty_id IS NULL OR ss.section_id IS NULL;