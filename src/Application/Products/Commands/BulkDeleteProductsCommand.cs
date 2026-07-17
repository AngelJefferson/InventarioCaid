using InventoryManagement.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagement.Application.Products.Commands;

public record BulkDeleteProductsCommand(List<Guid> Ids) : IRequest<int>;

public class BulkDeleteProductsCommandHandler : IRequestHandler<BulkDeleteProductsCommand, int>
{
    private readonly IApplicationDbContext _context;

    public BulkDeleteProductsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(BulkDeleteProductsCommand request, CancellationToken cancellationToken)
    {
        var products = await _context.Products
            .Where(p => request.Ids.Contains(p.Id))
            .ToListAsync(cancellationToken);

        _context.Products.RemoveRange(products);
        await _context.SaveChangesAsync(cancellationToken);

        return products.Count;
    }
}
