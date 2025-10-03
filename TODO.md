Task Scheduling algorithm

1. Calculate average over weeks, avg = (total hours * 1.1) /last deadline
2. Make a list of tasks, tl = with the earliest deadline school as first
3. initialize curr_week = 1 (avoid div by 0), id = 0
4. while id < size(tl):
      1. if deadline(tl[id]) <= curr_week 
            //schedule tl[id] for curr_week (schedule before deadline)  
            task_list[curr_week].push(id); id++
            // calculate avg for rest of the tasks until final deadline
            avg = (total time for remaining tasks * 1.1) /last deadline
         
         // if task fits within this week, schedule it in curr_week   
      2. else if sum(task_list[curr_week]) + tl[id] < avg
                    task_list[curr_week].push(id); id++
        // or move to next week
      3. else
                 curr_week++

