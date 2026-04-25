# 📋 TODO: FRONTEND INTEGRATION TASKS

## 🎯 Overview

This document lists all tasks needed to complete the frontend integration with the backend API.

---

## ✅ COMPLETED

- ✅ All pages designed and built
- ✅ All components created
- ✅ Redux state management setup
- ✅ RTK Query structure ready
- ✅ Forms with validation
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Accessibility features

---

## ❌ TODO: PHASE 1 - SETUP (1-2 hours)

### Environment & Configuration
- [ ] Verify `.env.local` has correct API URL
- [ ] Test API connectivity from frontend
- [ ] Set up error logging
- [ ] Set up API interceptors

### RTK Query Setup
- [ ] Create `store/api/jobsApi.ts`
- [ ] Create `store/api/applicantsApi.ts`
- [ ] Create `store/api/screeningsApi.ts`
- [ ] Configure base query with error handling
- [ ] Set up cache invalidation strategy

### Redux Store
- [ ] Update `store/slices/jobsSlice.ts`
- [ ] Update `store/slices/applicantsSlice.ts`
- [ ] Update `store/slices/screeningsSlice.ts`
- [ ] Add loading states
- [ ] Add error states

---

## ❌ TODO: PHASE 2 - JOBS FEATURE (2-3 hours)

### API Endpoints
- [ ] Implement `useCreateJobMutation`
  - [ ] Add weight validation
  - [ ] Add error handling
  - [ ] Add success notification
  
- [ ] Implement `useListJobsQuery`
  - [ ] Add pagination support
  - [ ] Add caching
  - [ ] Add error handling
  
- [ ] Implement `useGetJobByIdQuery`
  - [ ] Add loading state
  - [ ] Add error handling
  - [ ] Add cache invalidation
  
- [ ] Implement `useUpdateJobMutation`
  - [ ] Check weights lock
  - [ ] Add weight validation
  - [ ] Add error handling
  - [ ] Handle 409 error (weights locked)
  
- [ ] Implement `useDeleteJobMutation`
  - [ ] Add confirmation dialog
  - [ ] Add error handling
  - [ ] Update Redux store

### Components
- [ ] Update `components/jobs/JobForm.tsx`
  - [ ] Connect to createJob mutation
  - [ ] Connect to updateJob mutation
  - [ ] Add weight validation
  - [ ] Add weight lock check
  - [ ] Add error messages
  - [ ] Add success messages
  
- [ ] Update `components/jobs/JobCard.tsx`
  - [ ] Connect to getJobById query
  - [ ] Add loading state
  - [ ] Add error state
  
- [ ] Update `app/(dashboard)/jobs/page.tsx`
  - [ ] Connect to listJobs query
  - [ ] Add pagination
  - [ ] Add search/filter
  - [ ] Add loading state
  - [ ] Add error state
  
- [ ] Update `app/(dashboard)/jobs/[id]/page.tsx`
  - [ ] Connect to getJobById query
  - [ ] Show job details
  - [ ] Show applicant count
  - [ ] Show screening history

### Testing
- [ ] Test create job with valid weights
- [ ] Test create job with invalid weights (should fail)
- [ ] Test list jobs with pagination
- [ ] Test get job detail
- [ ] Test update job
- [ ] Test delete job
- [ ] Test error handling

---

## ❌ TODO: PHASE 3 - APPLICANTS FEATURE (2-3 hours)

### API Endpoints
- [ ] Implement `useCreateApplicantsMutation`
  - [ ] Add validation
  - [ ] Add error handling
  - [ ] Add success notification
  
- [ ] Implement `useUploadResumesMutation`
  - [ ] Add file validation
  - [ ] Add progress tracking
  - [ ] Add error handling
  
- [ ] Implement `useGetApplicantsQuery`
  - [ ] Add pagination support
  - [ ] Add caching
  - [ ] Add error handling

### Components
- [ ] Update `components/applicants/UmuravaIngestForm.tsx`
  - [ ] Connect to createApplicants mutation
  - [ ] Add validation
  - [ ] Add error messages
  - [ ] Add success messages
  
- [ ] Update `components/applicants/ExternalUploadForm.tsx`
  - [ ] Connect to uploadResumes mutation
  - [ ] Add file validation
  - [ ] Add progress bar
  - [ ] Add error messages
  - [ ] Add success messages
  
- [ ] Update `components/applicants/ApplicantTable.tsx`
  - [ ] Connect to getApplicants query
  - [ ] Add pagination
  - [ ] Add loading state
  - [ ] Add error state
  
- [ ] Update `app/(dashboard)/applicants/page.tsx`
  - [ ] Connect to getApplicants query
  - [ ] Show applicants list
  - [ ] Show upload form
  - [ ] Show manual entry form

### Testing
- [ ] Test create applicants manually
- [ ] Test upload CSV file
- [ ] Test upload PDF file
- [ ] Test upload multiple files
- [ ] Test file validation (type, size)
- [ ] Test list applicants with pagination
- [ ] Test error handling

---

## ❌ TODO: PHASE 4 - SCREENING FEATURE (2-3 hours)

### API Endpoints
- [ ] Implement `useStartScreeningMutation`
  - [ ] Check applicants exist
  - [ ] Add error handling
  - [ ] Save runId
  
- [ ] Implement `useGetScreeningStatusQuery`
  - [ ] Add polling support
  - [ ] Add error handling
  
- [ ] Implement `useGetScreeningResultsQuery`
  - [ ] Add caching
  - [ ] Add error handling

### Hooks
- [ ] Create `hooks/useScreeningPoller.ts`
  - [ ] Implement polling logic
  - [ ] Poll every 2-3 seconds
  - [ ] Stop when complete/failed
  - [ ] Handle errors
  
- [ ] Create `hooks/useWeightValidation.ts`
  - [ ] Validate weights sum to 1.0
  - [ ] Allow ±0.001 tolerance

### Components
- [ ] Update `components/screenings/RunScreeningModal.tsx`
  - [ ] Connect to startScreening mutation
  - [ ] Check applicants exist
  - [ ] Add confirmation dialog
  - [ ] Add error handling
  - [ ] Save runId
  
- [ ] Update `components/screenings/ScreeningStatusPoller.tsx`
  - [ ] Connect to getScreeningStatus query
  - [ ] Implement polling
  - [ ] Show progress bar
  - [ ] Show status text
  - [ ] Stop polling when complete
  
- [ ] Update `components/screenings/ShortlistTable.tsx`
  - [ ] Connect to getScreeningResults query
  - [ ] Show ranked candidates
  - [ ] Show scores
  - [ ] Show recommendations
  - [ ] Add sorting/filtering
  
- [ ] Update `components/screenings/CandidateDetailDrawer.tsx`
  - [ ] Show full candidate details
  - [ ] Show score breakdown
  - [ ] Show strengths/gaps
  - [ ] Show recommendation
  
- [ ] Update `components/screenings/CompareModal.tsx`
  - [ ] Compare multiple candidates
  - [ ] Show score comparison
  - [ ] Show strengths comparison
  - [ ] Show gaps comparison

### Testing
- [ ] Test start screening with applicants
- [ ] Test start screening without applicants (should fail)
- [ ] Test polling status
- [ ] Test progress bar updates
- [ ] Test get results when complete
- [ ] Test error handling
- [ ] Test candidate details
- [ ] Test candidate comparison

---

## ❌ TODO: PHASE 5 - ERROR HANDLING (1-2 hours)

### Error Codes
- [ ] Handle `NOT_FOUND` (404)
- [ ] Handle `VALIDATION_ERROR` (400)
- [ ] Handle `INVALID_WEIGHTS` (400)
- [ ] Handle `WEIGHTS_LOCKED` (409)
- [ ] Handle `JOB_NOT_FOUND` (400)
- [ ] Handle `NO_APPLICANTS` (400)
- [ ] Handle `SCREENING_NOT_COMPLETE` (400)
- [ ] Handle `NO_FILES` (400)

### Error Handling
- [ ] Create error handler utility
- [ ] Add error messages for each code
- [ ] Add retry logic
- [ ] Add error logging
- [ ] Add user-friendly error display

### Testing
- [ ] Test each error code
- [ ] Test error messages
- [ ] Test retry logic
- [ ] Test error logging

---

## ❌ TODO: PHASE 6 - BUSINESS LOGIC (1-2 hours)

### Weights Validation
- [ ] Validate weights sum to 1.0
- [ ] Show real-time validation feedback
- [ ] Prevent form submission if invalid
- [ ] Allow ±0.001 tolerance

### Weights Lock
- [ ] Check if job has screening runs
- [ ] Disable weight inputs if screening exists
- [ ] Show warning message
- [ ] Handle 409 error

### Applicants Required
- [ ] Check applicant count before screening
- [ ] Show error if count = 0
- [ ] Disable "Start Screening" button
- [ ] Show applicant count

### Polling Strategy
- [ ] Poll every 2-3 seconds
- [ ] Stop when complete/failed
- [ ] Show progress bar
- [ ] Handle network errors
- [ ] Implement exponential backoff

---

## ❌ TODO: PHASE 7 - TESTING & POLISH (2-3 hours)

### Unit Tests
- [ ] Test weight validation
- [ ] Test error handling
- [ ] Test API calls
- [ ] Test Redux actions

### Integration Tests
- [ ] Test job creation flow
- [ ] Test applicant upload flow
- [ ] Test screening flow
- [ ] Test error scenarios

### E2E Tests
- [ ] Test complete job creation
- [ ] Test complete applicant upload
- [ ] Test complete screening
- [ ] Test error recovery

### Performance
- [ ] Optimize API calls
- [ ] Implement caching
- [ ] Optimize re-renders
- [ ] Optimize bundle size

### UX Polish
- [ ] Add loading skeletons
- [ ] Add smooth transitions
- [ ] Add helpful tooltips
- [ ] Add keyboard shortcuts
- [ ] Test accessibility

---

## 📊 PROGRESS TRACKING

### Phase 1: Setup
- [ ] 0% - Not started
- [ ] 25% - In progress
- [ ] 50% - Half done
- [ ] 75% - Almost done
- [ ] 100% - Complete

### Phase 2: Jobs Feature
- [ ] 0% - Not started
- [ ] 25% - In progress
- [ ] 50% - Half done
- [ ] 75% - Almost done
- [ ] 100% - Complete

### Phase 3: Applicants Feature
- [ ] 0% - Not started
- [ ] 25% - In progress
- [ ] 50% - Half done
- [ ] 75% - Almost done
- [ ] 100% - Complete

### Phase 4: Screening Feature
- [ ] 0% - Not started
- [ ] 25% - In progress
- [ ] 50% - Half done
- [ ] 75% - Almost done
- [ ] 100% - Complete

### Phase 5: Error Handling
- [ ] 0% - Not started
- [ ] 25% - In progress
- [ ] 50% - Half done
- [ ] 75% - Almost done
- [ ] 100% - Complete

### Phase 6: Business Logic
- [ ] 0% - Not started
- [ ] 25% - In progress
- [ ] 50% - Half done
- [ ] 75% - Almost done
- [ ] 100% - Complete

### Phase 7: Testing & Polish
- [ ] 0% - Not started
- [ ] 25% - In progress
- [ ] 50% - Half done
- [ ] 75% - Almost done
- [ ] 100% - Complete

---

## 📈 ESTIMATED TIMELINE

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| 1. Setup | 5 | 1-2 | ❌ TODO |
| 2. Jobs | 15 | 2-3 | ❌ TODO |
| 3. Applicants | 12 | 2-3 | ❌ TODO |
| 4. Screening | 18 | 2-3 | ❌ TODO |
| 5. Error Handling | 8 | 1-2 | ❌ TODO |
| 6. Business Logic | 8 | 1-2 | ❌ TODO |
| 7. Testing & Polish | 15 | 2-3 | ❌ TODO |
| **TOTAL** | **81** | **10-15** | **❌ TODO** |

---

## 🎯 QUICK START

1. **Read** `INTEGRATION_GUIDE.md` (this directory)
2. **Start** with Phase 1: Setup
3. **Follow** the checklist step-by-step
4. **Test** each phase with the backend
5. **Move** to next phase when complete

---

## 📞 HELP

If you get stuck:
1. Check `INTEGRATION_GUIDE.md` for detailed instructions
2. Review the component files for examples
3. Check the backend API documentation
4. Test API endpoints with curl first

---

## ✨ SUMMARY

**Total Tasks:** 81  
**Estimated Time:** 10-15 hours  
**Difficulty:** Medium  
**Status:** ❌ Not Started

**Let's build! 🚀**

