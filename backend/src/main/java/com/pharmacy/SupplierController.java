
package com.pharmacy.backend;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@CrossOrigin(origins = "http://localhost:5173")
public class SupplierController {

    private final SupplierRepository supplierRepository;

    public SupplierController(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @GetMapping
    public List<Supplier> getAllSuppliers() {
        return supplierRepository.findAll();
    }

    @GetMapping("/{id}")
    public Supplier getSupplierById(@PathVariable Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new SupplierNotFoundException(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Supplier addSupplier(@RequestBody Supplier supplier) {
        supplier.setId(null);
        return supplierRepository.save(supplier);
    }

    @PutMapping("/{id}")
    public Supplier updateSupplier(
            @PathVariable Long id,
            @RequestBody Supplier updatedSupplier) {

        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new SupplierNotFoundException(id));

        existing.setName(updatedSupplier.getName());
        existing.setContactPerson(updatedSupplier.getContactPerson());
        existing.setPhone(updatedSupplier.getPhone());
        existing.setEmail(updatedSupplier.getEmail());
        existing.setAddress(updatedSupplier.getAddress());

        return supplierRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSupplier(@PathVariable Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new SupplierNotFoundException(id);
        }

        supplierRepository.deleteById(id);
    }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    private static class SupplierNotFoundException extends RuntimeException {
        public SupplierNotFoundException(Long id) {
            super("Supplier not found with ID: " + id);
        }
    }
}
