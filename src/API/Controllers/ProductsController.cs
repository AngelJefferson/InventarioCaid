using InventoryManagement.Application.Products.Commands;
using InventoryManagement.Application.Products.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryManagement.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? categoryId, [FromQuery] string? searchTerm)
    {
        var products = await _mediator.Send(new GetAllProductsQuery(categoryId, searchTerm));
        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var product = await _mediator.Send(new GetProductByIdQuery(id));
        return Ok(product);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductCommand command)
    {
        var product = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductCommand command)
    {
        if (id != command.Id)
            return BadRequest("Id mismatch");

        var product = await _mediator.Send(command);
        return Ok(product);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreate([FromBody] BulkCreateProductsCommand command)
    {
        var count = await _mediator.Send(command);
        return Ok(new { created = count });
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteProductCommand(id));
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("bulk")]
    public async Task<IActionResult> BulkDelete([FromBody] BulkDeleteProductsCommand command)
    {
        var count = await _mediator.Send(command);
        return Ok(new { deleted = count });
    }
}
