set role anon;
\echo == direct table access (all must fail)
select count(*) from visitor_data;
insert into visitor_data ("visitorId") values ('hackhack1');
delete from visitor_data;
select * from poll_votes;
select * from survey_responses;
\echo == community view
select * from community_measurements;
\echo == own row (legacy id)
select * from get_measurements('vabc123def');
\echo == submit new + update legacy
select submit_measurements('v1234567890abcdef', 13.123, 11.5, null, null);
select submit_measurements('vabc123def', 15.2, 12.7, 9, null);
select * from get_measurements('vabc123def');
\echo == invalid inputs (all must fail)
select submit_measurements('short', 13, 11, null, null);
select submit_measurements('v1234567890abcdef', 300, 11, null, null);
select submit_measurements('v1234567890abcdef');
select submit_measurements('v123''; drop table x;--', 13, null, null, null);
\echo == delete
select delete_measurements('v1234567890abcdef');
select count(*) from community_measurements;
\echo == polls
select * from cast_vote('q1', 'v1234567890abcdef', 2);
select * from cast_vote('q1', 'vabc123def', 2);
select * from cast_vote('q1', 'vabc123def', 0);
select * from poll_results('q1');
select * from cast_vote('bad poll', 'vabc123def', 0);
select * from cast_vote('q1', 'vabc123def', 99);
\echo == survey insert ok, read fails
insert into survey_responses (response) values ('{"a":1}');
select count(*) from survey_responses;
reset role;
\echo == admin view
select "visitorId", unit, "erectLength", "visitCount", timestamp from visitor_data order by id;
select count(*) from survey_responses;
