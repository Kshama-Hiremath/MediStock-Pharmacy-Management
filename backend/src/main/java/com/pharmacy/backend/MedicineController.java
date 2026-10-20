package com.pharmacy.backend;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
@CrossOrigin(origins = "http://localhost:5173")
public class MedicineController {

    private final MedicineRepository medicineRepository;

    public MedicineController(MedicineRepository medicineRepository) {
        this.medicineRepository = medicineRepository;
    }

    // Get all medicines
    @GetMapping
    public List<Medicine> getAllMedicines() {
        return medicineRepository.findAll();
    }

    // Get a medicine by ID
    @GetMapping("/{id}")
    public Medicine getMedicineById(@PathVariable Long id) {
        return medicineRepository.findById(id)
                .orElseThrow(() ->
                        new MedicineNotFoundException(id));
    }

    // Add a new medicine
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Medicine addMedicine(@RequestBody Medicine medicine) {
        medicine.setId(null);
        return medicineRepository.save(medicine);
    }

    // Edit an existing medicine
    @PutMapping("/{id}")
    public Medicine updateMedicine(
            @PathVariable Long id,
            @RequestBody Medicine updatedMedicine) {

        Medicine existingMedicine = medicineRepository.findById(id)
                .orElseThrow(() ->
                        new MedicineNotFoundException(id));

        existingMedicine.setName(updatedMedicine.getName());
        existingMedicine.setCategory(updatedMedicine.getCategory());
        existingMedicine.setStock(updatedMedicine.getStock());
        existingMedicine.setPrice(updatedMedicine.getPrice());
        existingMedicine.setExpiryDate(updatedMedicine.getExpiryDate());

        return medicineRepository.save(existingMedicine);
    }

    // Delete a medicine
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMedicine(@PathVariable Long id) {
        if (!medicineRepository.existsById(id)) {
            throw new MedicineNotFoundException(id);
        }

        medicineRepository.deleteById(id);
    }

    // Return a clear 404 when a medicine doesn't exist
    @ResponseStatus(HttpStatus.NOT_FOUND)
    private static class MedicineNotFoundException
            extends RuntimeException {

        public MedicineNotFoundException(Long id) {
            super("Medicine not found with ID: " + id);
        }
    }
}