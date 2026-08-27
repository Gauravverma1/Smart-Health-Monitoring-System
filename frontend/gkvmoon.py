///////////////////////////////////////////////////////////////////////////////////////
 //program 2 mergeSort;

 def merge_sort(a):
    if len(a) <= 1:
        return a

    mid = len(a)//2
    left = merge_sort(a[:mid])
    right = merge_sort(a[mid:])

    i = j = 0
    res = []

    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            res.append(left[i]); i += 1
        else:
            res.append(right[j]); j += 1

    res.extend(left[i:])
    res.extend(right[j:])
    return res

a = [19, 12, 34, 5, 25, 8]
print("Sorted list:", merge_sort(a)
      

///////////////////////////////////////////////////////////////////////////////////////  




////////////////////////////////////////////////////////////////////////////////////////