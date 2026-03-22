Here are all requests with #21 removed and renumbered:
npm install helmet express-rate-limit express-mongo-sanitize xss-clean hpp
---

## BASE URL: `http://localhost:8080`

---

## 🔐 AUTH

**1. Signup — Coach**
```
POST http://localhost:8080/auth/signup
Content-Type: application/json

{
  "Name": "Rajesh Kumar",
  "Email": "rajesh@visionias.com",
  "Password": "Test@1234",
  "Phone": "9876543210"
}
```

---

**2. Signup — Student**
```
POST http://localhost:8080/auth/signup
Content-Type: application/json

{
  "Name": "Priya Sharma",
  "Email": "priya@gmail.com",
  "Password": "Student@456",
  "Phone": "9123456789"
}
```

---

**3. Signin — Coach**
```
POST http://localhost:8080/auth/signin
Content-Type: application/json

{
  "Email": "rajesh@visionias.com",
  "Password": "Test@1234"
}
```

---

**4. Get Me**
```
GET http://localhost:8080/auth/me
```

---

**5. Update Profile**
```
PATCH http://localhost:8080/auth/profile
Content-Type: application/json

{
  "Name": "Rajesh Kumar Singh",
  "Phone": "9999988888"
}
```

---

**6. Forgot Password**
```
POST http://localhost:8080/auth/forgot-password
Content-Type: application/json

{
  "Email": "rajesh@visionias.com"
}
```

---

**7. Change Password** — replace `USER_ID`
```
PATCH http://localhost:8080/auth/change-password/USER_ID
Content-Type: application/json

{
  "Password": "NewPass@789"
}
```

---

**8. Signout**
```
POST http://localhost:8080/auth/signout
```

---

**9. Signin Coach again after signout**
```
POST http://localhost:8080/auth/signin
Content-Type: application/json

{
  "Email": "rajesh@visionias.com",
  "Password": "NewPass@789"
}
```

---

**10. ❌ Duplicate Email — expect 409**
```
POST http://localhost:8080/auth/signup
Content-Type: application/json

{
  "Name": "Fake",
  "Email": "rajesh@visionias.com",
  "Password": "Test@1234"
}
```

---

**11. ❌ Wrong Password — expect 401**
```
POST http://localhost:8080/auth/signin
Content-Type: application/json

{
  "Email": "rajesh@visionias.com",
  "Password": "wrongpassword"
}
```

---

**12. ❌ Missing Email — expect 400**
```
POST http://localhost:8080/auth/signup
Content-Type: application/json

{
  "Password": "Test@1234"
}
```

---

## 🏫 COACHING

> Must be signed in as Coach

**13. Create Coaching**
```
POST http://localhost:8080/coaching/create
Content-Type: application/json

{
  "name": "Vision IAS Academy",
  "description": "Top coaching for UPSC aspirants in Delhi",
  "examTypes": ["UPSC", "STATE"],
  "city": "Delhi",
  "email": "contact@visionias.com",
  "phone": "011-12345678",
  "website": "https://visionias.com"
}
```
✅ Copy `_id` → `COACHING_ID`
✅ Copy `slug` → `COACHING_SLUG`

---

**14. Get All Coachings**
```
GET http://localhost:8080/coaching
```

---

**15. Filter by ExamType**
```
GET http://localhost:8080/coaching?examType=UPSC
```

---

**16. Filter by City**
```
GET http://localhost:8080/coaching?city=Delhi
```

---

**17. Get My Coaching Dashboard**
```
GET http://localhost:8080/coaching/mine
```

---

**18. Get Coaching by Slug**
```
GET http://localhost:8080/coaching/COACHING_SLUG
```

---

**19. Update Coaching**
```
PATCH http://localhost:8080/coaching/COACHING_ID
Content-Type: application/json

{
  "description": "Premier coaching for UPSC and State PSC since 2010",
  "phone": "9876500000"
}
```

---

**20. ❌ Create Coaching without login — expect 401**
```
POST http://localhost:8080/coaching/create
Content-Type: application/json

{
  "name": "Fake Coaching"
}
```

---

**21. ❌ Invalid Slug — expect 404**
```
GET http://localhost:8080/coaching/this-does-not-exist-xyz
```

---

## 📝 TESTS

> Must be signed in as Coach

**22. Create Test — 5 inline questions**
```
POST http://localhost:8080/tests/create
Content-Type: application/json

{
  "title": "UPSC Prelims Mock Test 1",
  "coachingId": "COACHING_ID",
  "examType": "UPSC",
  "subject": "gs",
  "timeLimitMin": 120,
  "visibility": "public",
  "inlineQuestions": [
    {
      "qus": "Who was the chairman of the Drafting Committee of the Indian Constitution?",
      "options": ["Jawaharlal Nehru", "B.R. Ambedkar", "Sardar Patel", "Rajendra Prasad"],
      "answer": 1,
      "explanation": "Dr. B.R. Ambedkar was the chairman of the Drafting Committee."
    },
    {
      "qus": "Which Article of the Constitution deals with Right to Equality?",
      "options": ["Article 12", "Article 14", "Article 19", "Article 21"],
      "answer": 1,
      "explanation": "Article 14 guarantees equality before law."
    },
    {
      "qus": "The Preamble was amended by which Constitutional Amendment?",
      "options": ["42nd", "44th", "52nd", "61st"],
      "answer": 0,
      "explanation": "The 42nd Amendment 1976 added Socialist, Secular and Integrity."
    },
    {
      "qus": "Rajya Sabha is also known as?",
      "options": ["House of People", "Council of States", "Federal House", "Senate"],
      "answer": 1,
      "explanation": "Rajya Sabha is the Council of States."
    },
    {
      "qus": "Who appoints the Chief Election Commissioner of India?",
      "options": ["Prime Minister", "Speaker of Lok Sabha", "President of India", "Chief Justice"],
      "answer": 2,
      "explanation": "The President appoints the CEC under Article 324."
    }
  ]
}
```
✅ Copy `_id` → `TEST_ID`
✅ Copy `slug` → `TEST_SLUG`
✅ Copy `accessToken` → `ACCESS_TOKEN`

---

**23. Create Private Test**
```
POST http://localhost:8080/tests/create
Content-Type: application/json

{
  "title": "SSC CGL Maths Private Test",
  "coachingId": "COACHING_ID",
  "examType": "SSC",
  "subject": "math",
  "timeLimitMin": 60,
  "visibility": "private",
  "password": "vision2024",
  "inlineQuestions": [
    {
      "qus": "If 20% of a number is 80, what is the number?",
      "options": ["200", "300", "400", "500"],
      "answer": 2,
      "explanation": "20% of x = 80 so x = 400"
    },
    {
      "qus": "A train 200m long passes a pole in 10 seconds. Speed is?",
      "options": ["15 m/s", "20 m/s", "25 m/s", "30 m/s"],
      "answer": 1,
      "explanation": "Speed = 200/10 = 20 m/s"
    },
    {
      "qus": "Simple interest on Rs 5000 at 8% per annum for 3 years?",
      "options": ["Rs 1000", "Rs 1200", "Rs 1500", "Rs 1800"],
      "answer": 1,
      "explanation": "SI = 5000 x 8 x 3 / 100 = 1200"
    }
  ]
}
```
✅ Copy `slug` → `PRIVATE_TEST_SLUG`

---

**24. Get All Public Tests**
```
GET http://localhost:8080/tests
```

---

**25. Filter Tests by CoachingId**
```
GET http://localhost:8080/tests?coachingId=COACHING_ID
```

---

**26. Filter Tests by ExamType**
```
GET http://localhost:8080/tests?examType=UPSC
```

---

**27. Get Test by ID — Coach view**
```
GET http://localhost:8080/tests/id/TEST_ID
```

---

**28. Get Test by Slug — Student view**
```
GET http://localhost:8080/tests/TEST_SLUG
```

---

**29. Get Private Test — Correct Password**
```
GET http://localhost:8080/tests/PRIVATE_TEST_SLUG?password=vision2024
```

---

**30. Get Test via WhatsApp Token — no login needed**
```
GET http://localhost:8080/tests/token/ACCESS_TOKEN
```

---

**31. Get Test Stats**
```
GET http://localhost:8080/tests/TEST_ID/stats
```

---

**32. Get Leaderboard**
```
GET http://localhost:8080/tests/TEST_ID/leaderboard
```

---

**33. Update Test**
```
PATCH http://localhost:8080/tests/TEST_ID
Content-Type: application/json

{
  "timeLimitMin": 90,
  "startsAt": "2026-03-10T09:00:00.000Z",
  "endsAt": "2026-03-10T11:00:00.000Z"
}
```

---

**34. ❌ Get Private Test Wrong Password — expect 403**
```
GET http://localhost:8080/tests/PRIVATE_TEST_SLUG?password=wrongpass
```

---

**35. ❌ Create Test Missing Title — expect 400**
```
POST http://localhost:8080/tests/create
Content-Type: application/json

{
  "coachingId": "COACHING_ID",
  "examType": "SSC"
}
```

---

**36. ❌ Get Test Invalid ID — expect 404**
```
GET http://localhost:8080/tests/this-slug-does-not-exist-xyz
```

---

## 📊 RESULTS

> Signin as Student first

**37. Signin — Student**
```
POST http://localhost:8080/auth/signin
Content-Type: application/json

{
  "Email": "priya@gmail.com",
  "Password": "Student@456"
}
```

---

**38. Submit Result**
```
POST http://localhost:8080/results/submit
Content-Type: application/json

{
  "testId": "TEST_ID",
  "score": 3,
  "totalQuestions": 5,
  "wrongAnswers": 1,
  "timeTaken": 432,
  "allAnswers": { "0": 1, "1": 1, "2": 0, "3": 1, "4": 0 },
  "correctQus": [0, 1, 2],
  "wrongQus": [4],
  "answeredQus": [0, 1, 2, 4],
  "notAnsweredQus": [3],
  "markedAndAnswered": [2],
  "markedNotAnswered": [3]
}
```
✅ Copy `_id` → `RESULT_ID`
✅ Check `percentage: 60` and `percentile` in response

---

**39. Submit Perfect Score — same test**
```
POST http://localhost:8080/results/submit
Content-Type: application/json

{
  "testId": "TEST_ID",
  "score": 5,
  "totalQuestions": 5,
  "wrongAnswers": 0,
  "timeTaken": 198,
  "allAnswers": { "0": 1, "1": 1, "2": 0, "3": 1, "4": 2 },
  "correctQus": [0, 1, 2, 3, 4],
  "wrongQus": [],
  "answeredQus": [0, 1, 2, 3, 4],
  "notAnsweredQus": [],
  "markedAndAnswered": [],
  "markedNotAnswered": []
}
```

---

**40. Get My Results**
```
GET http://localhost:8080/results/student/me
```

---

**41. Get My Results — Filter by Test**
```
GET http://localhost:8080/results/student/me?testId=TEST_ID
```

---

**42. Get Single Result — Full Detail**
```
GET http://localhost:8080/results/RESULT_ID
```

---

**43. Get All Results for Test — Signin as Coach first**
```
POST http://localhost:8080/auth/signin
Content-Type: application/json

{
  "Email": "rajesh@visionias.com",
  "Password": "NewPass@789"
}
```
then:
```
GET http://localhost:8080/results/test/TEST_ID
```

---

**44. ❌ Submit Missing testId — expect 400**
```
POST http://localhost:8080/results/submit
Content-Type: application/json

{
  "score": 3,
  "totalQuestions": 5
}
```

---

**45. ❌ Submit Fake testId — expect 404**
```
POST http://localhost:8080/results/submit
Content-Type: application/json

{
  "testId": "000000000000000000000000",
  "score": 3,
  "totalQuestions": 5
}
```

---

## ❓ QUESTIONS

> Run this in MongoDB first then signin as Coach:
> ```
> db.users.updateOne({Email:"rajesh@visionias.com"},{$set:{isAdmin:true}})
> ```

**46. Get Subject Tree**
```
GET http://localhost:8080/questions/subjects
```

---

**47. Create Question Group**
```
POST http://localhost:8080/questions/create
Content-Type: application/json

{
  "subject": "math",
  "section": "Quantitative Aptitude",
  "topic": "Profit and Loss",
  "difficultyLevel": "medium",
  "question": [
    {
      "qus": "A shopkeeper sells at 20% profit. CP is Rs 500. Find SP.",
      "options": ["Rs 550", "Rs 600", "Rs 650", "Rs 700"],
      "answer": 1,
      "explanation": "SP = 500 x 1.20 = 600",
      "exam": "SSC"
    },
    {
      "qus": "A chair sold for Rs 720 at 10% loss. Find CP.",
      "options": ["Rs 780", "Rs 800", "Rs 820", "Rs 850"],
      "answer": 1,
      "explanation": "CP = 720 / 0.9 = 800",
      "exam": "SSC"
    },
    {
      "qus": "Goods marked 40% above cost, 20% discount given. Profit%?",
      "options": ["10%", "12%", "14%", "16%"],
      "answer": 1,
      "explanation": "Profit% = 1.4 x 0.8 - 1 x 100 = 12%",
      "exam": "UPSC"
    }
  ]
}
```
✅ Copy `_id` → `QUESTION_DOC_ID`

---

**48. Bulk Create Questions**
```
POST http://localhost:8080/questions/create-many
Content-Type: application/json

[
  {
    "subject": "english",
    "section": "Verbal",
    "topic": "Synonyms",
    "difficultyLevel": "easy",
    "question": [
      {
        "qus": "Synonym of ABUNDANT",
        "options": ["Scarce", "Plentiful", "Rare", "Limited"],
        "answer": 1,
        "explanation": "Abundant means plentiful."
      },
      {
        "qus": "Synonym of BENEVOLENT",
        "options": ["Cruel", "Kind", "Harsh", "Strict"],
        "answer": 1,
        "explanation": "Benevolent means kind and well-meaning."
      }
    ]
  },
  {
    "subject": "gs",
    "section": "History",
    "topic": "Modern India",
    "difficultyLevel": "hard",
    "question": [
      {
        "qus": "Indian Independence Act was passed in which year?",
        "options": ["1945", "1946", "1947", "1948"],
        "answer": 2,
        "explanation": "The Indian Independence Act was passed in 1947."
      },
      {
        "qus": "Who was the last Viceroy of India?",
        "options": ["Lord Mountbatten", "Lord Wavell", "Lord Linlithgow", "Lord Irwin"],
        "answer": 0,
        "explanation": "Lord Mountbatten was the last Viceroy of British India."
      }
    ]
  }
]
```

---

**49. Get All Questions**
```
GET http://localhost:8080/questions
```

---

**50. Filter by Subject**
```
GET http://localhost:8080/questions?subject=math
```

---

**51. Filter by Subject + Section + Difficulty**
```
GET http://localhost:8080/questions?subject=math&section=Quantitative Aptitude&difficultyLevel=medium
```

---

**52. Filter by Subject + Topic**
```
GET http://localhost:8080/questions?subject=gs&topic=Modern India
```

---

**53. Get Single Question Doc**
```
GET http://localhost:8080/questions/QUESTION_DOC_ID
```

---

**54. Add Items to Question Doc**
```
PATCH http://localhost:8080/questions/QUESTION_DOC_ID/add-items
Content-Type: application/json

{
  "items": [
    {
      "qus": "A bike sold for Rs 4500 at 12.5% profit. Find CP.",
      "options": ["Rs 3800", "Rs 4000", "Rs 4200", "Rs 4400"],
      "answer": 1,
      "explanation": "CP = 4500 / 1.125 = 4000",
      "exam": "BANK"
    }
  ]
}
```

---

**55. Create Test from Question Library**
```
POST http://localhost:8080/tests/create
Content-Type: application/json

{
  "title": "Math Practice from Library",
  "coachingId": "COACHING_ID",
  "examType": "SSC",
  "timeLimitMin": 30,
  "visibility": "public",
  "questionDocIds": ["QUESTION_DOC_ID"]
}
```

---

**56. ❌ Create Question Non-Admin — expect 403**
> Signin as Student first, then:
```
POST http://localhost:8080/questions/create
Content-Type: application/json

{
  "subject": "math",
  "section": "Test",
  "topic": "Test",
  "question": []
}
```

---

## 🧹 CLEANUP

**57. Soft Delete Test**
```
DELETE http://localhost:8080/tests/TEST_ID
```

---

**58. Soft Delete Coaching**
```
DELETE http://localhost:8080/coaching/COACHING_ID
```

---

**59. Health Check**
```
GET http://localhost:8080/health
```