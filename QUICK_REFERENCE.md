# 🚀 QUICK REFERENCE - FRONTEND INTEGRATION

## 📍 Quick Links

| Resource | Location | Purpose |
|----------|----------|---------|
| **Integration Guide** | `INTEGRATION_GUIDE.md` | Detailed integration instructions |
| **TODO List** | `TODO_INTEGRATION.md` | Task checklist |
| **This File** | `QUICK_REFERENCE.md` | Quick lookup reference |

---

## 🔗 API ENDPOINTS SUMMARY

### Jobs (5 endpoints)
```
POST   /api/jobs                    Create job
GET    /api/jobs?limit=20&offset=0  List jobs
GET    /api/jobs/:jobId             Get job detail
PATCH  /api/jobs/:jobId             Update job
DELETE /api/jobs/:jobId             Delete job
```

### Applicants (3 endpoints)
```
POST   /api/jobs/:jobId/applicants           Add applicants
POST   /api/jobs/:jobId/applicants/upload    Upload resumes
GET    /api/jobs/:jobId/applicants           List applicants
```

### Screenings (3 endpoints)
```
POST   /api/jobs/:jobId/screenings           Start screening
GET    /api/screenings/:runId/status         Poll status
GET    /api/screenings/:runId/results        Get results
```

---

## ⚠️ CRITICAL BUSINESS LOGIC

### 1. Weights Validation
```
✅ Must sum to 1.0 (±0.001 tolerance)
❌ Validate BEFORE sending to backend
❌ Show error if invalid
```

### 2. Weights Lock
```
✅ Locked after screening starts
❌ Disable weight inputs if screening exists
❌ Show warning message
❌ Handle 409 error
```

### 3. Applicants Required
```
✅ Need at least 1 applicant to screen
❌ Check count before allowing screening
❌ Show error if count = 0
```

### 4. Polling Strategy
```
✅ Poll every 2-3 seconds
✅ Stop when status = "complete" or "failed"
✅ Show progress bar (0-100%)
```

---

## 🚨 ERROR CODES

| Code | HTTP | Action |
|------|------|--------|
| `NOT_FOUND` | 404 | Show "Not found" |
| `VALIDATION_ERROR` | 400 | Show validation errors |
| `INVALID_WEIGHTS` | 400 | Show weight error |
| `WEIGHTS_LOCKED` | 409 | Disable weight inputs |
| `JOB_NOT_FOUND` | 400 | Show "Job not found" |
| `NO_APPLICANTS` | 400 | Show "Add applicants" |
| `SCREENING_NOT_COMPLETE` | 400 | Show "Still processing" |
| `NO_FILES` | 400 | Show "Select files" |

---

## 📁 FILES TO MODIFY

### API Files
- `store/api/jobsApi.ts` - Jobs endpoints
- `store/api/applicantsApi.ts` - Applicants endpoints
- `store/api/screeningsApi.ts` - Screenings endpoints

### Component Files
- `components/jobs/JobForm.tsx` - Weight validation
- `components/applicants/ExternalUploadForm.tsx` - File upload
- `components/screenings/RunScreeningModal.tsx` - Start screening
- `components/screenings/ScreeningStatusPoller.tsx` - Polling

### Hook Files
- `hooks/useScreeningPoller.ts` - Polling logic
- `hooks/useWeightValidation.ts` - Weight validation

### Store Files
- `store/slices/jobsSlice.ts` - Jobs state
- `store/slices/applicantsSlice.ts` - Applicants state
- `store/slices/screeningsSlice.ts` - Screenings state

---

## 🎯 IMPLEMENTATION ORDER

1. **Setup** - Configure RTK Query
2. **Jobs** - Create, list, get, update, delete
3. **Applicants** - Upload, add, list
4. **Screenings** - Start, poll, results
5. **Error Handling** - Handle all error codes
6. **Business Logic** - Validation, locks, checks
7. **Testing** - Test all features

---

## 💻 CODE SNIPPETS

### Weight Validation
```typescript
const validateWeights = (weights: ScoringWeights): boolean => {
  const sum = weights.skills + weights.experience + weights.education + weights.cultural_fit;
  return Math.abs(sum - 1.0) <= 0.001;
};
```

### Polling Hook
```typescript
const useScreeningPoller = (runId: string) => {
  const [status, setStatus] = useState("pending");
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/screenings/${runId}/status`);
      const data = await response.json();
      setStatus(data.data.status);
      
      if (["complete", "failed"].includes(data.data.status)) {
        clearInterval(interval);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [runId]);
  
  return status;
};
```

### Error Handler
```typescript
const handleApiError = (error: any) => {
  const code = error.response?.data?.error?.code;
  
  switch (code) {
    case "INVALID_WEIGHTS":
      return "Weights must sum to 1.0";
    case "WEIGHTS_LOCKED":
      return "Weights cannot be changed";
    case "NO_APPLICANTS":
      return "Add applicants first";
    default:
      return "An error occurred";
  }
};
```

---

## 🧪 TESTING CHECKLIST

### Jobs
- [ ] Create job with valid weights
- [ ] Create job with invalid weights (fail)
- [ ] List jobs with pagination
- [ ] Get job detail
- [ ] Update job
- [ ] Delete job

### Applicants
- [ ] Add applicants manually
- [ ] Upload CSV file
- [ ] Upload PDF file
- [ ] List applicants

### Screenings
- [ ] Start screening with applicants
- [ ] Start screening without applicants (fail)
- [ ] Poll status
- [ ] Get results
- [ ] Update weights after screening (fail)

---

## 🔧 ENVIRONMENT SETUP

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001/ws/notifications
```

---

## 📊 PROGRESS CHECKLIST

### Phase 1: Setup
- [ ] RTK Query configured
- [ ] API endpoints created
- [ ] Redux store updated
- [ ] Error handling setup

### Phase 2: Jobs
- [ ] Create job working
- [ ] List jobs working
- [ ] Get job working
- [ ] Update job working
- [ ] Delete job working

### Phase 3: Applicants
- [ ] Add applicants working
- [ ] Upload resumes working
- [ ] List applicants working

### Phase 4: Screenings
- [ ] Start screening working
- [ ] Poll status working
- [ ] Get results working

### Phase 5: Business Logic
- [ ] Weight validation working
- [ ] Weight lock working
- [ ] Applicants check working
- [ ] Polling working

### Phase 6: Error Handling
- [ ] All error codes handled
- [ ] Error messages displayed
- [ ] Retry logic working

### Phase 7: Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance optimized

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] All endpoints tested
- [ ] All errors handled
- [ ] All business logic implemented
- [ ] Performance optimized
- [ ] Security checks passed
- [ ] User testing completed
- [ ] Documentation updated

---

## 📞 COMMON ISSUES

**API returning 404**
- Check backend running on 3001
- Check NEXT_PUBLIC_API_URL correct
- Check endpoint paths match

**Weights validation not working**
- Check validation logic
- Check weights sent correctly
- Check backend validation

**Polling not working**
- Check interval (2-3 seconds)
- Check runId saved
- Check backend returning status

**File upload failing**
- Check file types (.csv, .pdf)
- Check file size (max 10MB)
- Check max 50 files

---

## 📚 DOCUMENTATION

| File | Purpose |
|------|---------|
| `INTEGRATION_GUIDE.md` | Detailed integration instructions |
| `TODO_INTEGRATION.md` | Task checklist |
| `QUICK_REFERENCE.md` | This file - quick lookup |

---

## ✨ SUMMARY

**Total Endpoints:** 9  
**Total Error Codes:** 8  
**Total Business Rules:** 4  
**Estimated Time:** 10-15 hours  

**Start with:** `INTEGRATION_GUIDE.md`  
**Track Progress:** `TODO_INTEGRATION.md`  
**Quick Lookup:** `QUICK_REFERENCE.md`

---

## 🎯 NEXT STEPS

1. Read `INTEGRATION_GUIDE.md`
2. Follow `TODO_INTEGRATION.md`
3. Use `QUICK_REFERENCE.md` for quick lookup
4. Test with backend
5. Deploy when ready

**Let's build! 🚀**

